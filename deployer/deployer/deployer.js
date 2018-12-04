'use strict'

const aws = require('aws-sdk')
const fs = require('fs')
const defaultMeta = require(`../config/env/lambda-default.json`)
var envMeta = null
try {
  envMeta = require(`../config/env/${process.env.STAGE}/lambda.json`)
} catch (error) { }

var credentials = new aws.SharedIniFileCredentials({ profile: process.argv.AWS_PROFILE })
aws.config.credentials = credentials
aws.config.update({
  region: process.argv.AWS_REGION
})

module.exports = class Deployer {
  constructor (projectPath, projectName, packagePath, zippedFilesToDeploy) {
    this.projectPath = projectPath
    this.project = projectName
    this.packagePath = packagePath
    this.files = zippedFilesToDeploy
    this.createAwsLambda = () => {
      return new aws.Lambda()
    }
  }
  setCreateAwsLambda (func) {
    this.createAwsLambda = func
  }

  async deploy () {
    var promises = this.files.map((file) => {
      return this.runDeploy(file)
    })
    return Promise.all(promises)
  }
  async runDeploy (file) {
    // the file name should have the project name prepended to it in the form {projectName}-{fileName}
    let scriptName = file.replace(new RegExp(this.project + '-', 'g'), '')
    let lambdaMeta = this.getFunctionMeta(scriptName)
    let functionMeta = this.mergeMetas(defaultMeta, envMeta, lambdaMeta)
    let funcExists = await this.lambdaExists(file)
    let zipContent = this.getZipContent(file) // throw an error if zip file is missing
    if (funcExists) {
      // update the lambda function
      return this.updateFunction(zipContent, file, functionMeta)
    } else {
      // create the lambda function
      return this.createFunction(zipContent, file, functionMeta)
    }
  }

  getFunctionMeta (fileName) {
    return require(`${this.projectPath}/${this.project}/${fileName}.js`).meta
  }

  mergeMetas (metaDefault, metaEnv, metaFunc) {
    let meta = JSON.parse(JSON.stringify(metaDefault))
    // need to merge Tags and Environment Variables separately
    let tags = meta.Tags ? meta.Tags : {}
    let vars = meta.Environment && meta.Environment.Variables ? meta.Environment.Variables : {}
    if (metaEnv) {
      meta = Object.assign(meta, JSON.parse(JSON.stringify(metaEnv)))
      tags = Object.assign(tags, metaEnv.Tags)
      if (metaEnv.Environment) {
        vars = Object.assign(vars, metaEnv.Environment.Variables)
      }
    }
    if (metaFunc) {
      meta = Object.assign(meta, JSON.parse(JSON.stringify(metaFunc)))
      tags = Object.assign(tags, metaFunc.Tags)
      if (metaFunc.Environment) {
        vars = Object.assign(vars, metaFunc.Environment.Variables)
      }
    }
    meta.Tags = tags
    if (meta.Environment) {
      meta.Environment.Variables = vars
    }
    return meta
  }

  mergeMetaWithConfig (meta, config) {
    return Object.assign(meta, config)
  }

  getVpcConfig (metaDefault, metaEnv, metaFunc) {
    if (metaFunc && metaFunc.VpcConfig && metaFunc.VpcConfig.external === undefined) {
      if (typeof (metaFunc.VpcConfig) === 'string') {
        return metaEnv ? metaEnv.VpcConfig[metaFunc.VpcConfig] : metaDefault.VpcConfig[metaFunc.VpcConfig]
      } else {
        return metaFunc.VpcConfig
      }
    } else if (metaFunc.VpcConfig.external) {
      // if VpcConfig is from a .json file, it will have external as property
      // since a string wasn't specified we will use external as default
      return metaFunc.VpcConfig.external
    } else {
      // if the function meta object has VpcConfig object, use that instead
      return metaFunc.VpcConfig
    }
  }

  async getZipContent (fileName) {
    return fs.readFileSync(`../packages/${fileName}.zip`)
  }

  async lambdaExists (fileName) {
    let lambda = this.createAwsLambda()
    let params = {
      FunctionName: fileName
    }
    return new Promise((resolve, reject) => {
      lambda.getFunction(params, function (err, data) {
        if (err) {
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  async createFunction (zipContent, fileName, meta) {
    let lambda = this.createAwsLambda()
    let params = {
      FunctionName: fileName,
      Handler: `${fileName}.handler`,
      Publish: false,
      Code: {
        ZipFile: zipContent
      },
      VpcConfig: this.getVpcConfig(defaultMeta, envMeta, meta)
    }

    // params will override any properties in meta
    params = this.mergeMetaWithConfig(meta, params)

    return new Promise((resolve, reject) => {
      lambda.createFunction(params, function (err, data) {
        if (err) {
          console.log(`Could not create Lambda Function: ${fileName}`)
          reject(err)
        } else {
          // create the alias, all new functions are created with the 'dev' alias
          var alias = {
            FunctionName: params.FunctionName,
            FunctionVersion: `$LATEST`,
            Name: 'dev'
          }
          lambda.createAlias(alias, function (err, data) {
            if (err) {
              console.log(`Could not create alias for ${fileName}`)
              reject(err)
            } else {
              resolve(data.AliasArn)
            }
          })
        }
      })
    })
  }

  async updateFunction (zipContent, fileName, meta) {
    let lambda = this.createAwsLambda()
    let params = {
      FunctionName: fileName,
      Publish: false,
      ZipFile: zipContent
    }
    let configParams = {
      FunctionName: fileName,
      Handler: `${fileName}.handler`,
      VpcConfig: this.getVpcConfig(defaultMeta, envMeta, meta)
    }

    configParams = this.mergeMetaWithConfig(meta, configParams)

    return new Promise((resolve, reject) => {
      lambda.updateFunctionCode(params, function (err, data) {
        if (err) {
          console.log(`Could not update function ${fileName}`)
        } else {
          lambda.updateFunctionConfiguration(configParams, function (err, data) {
            if (err) {
              console.log(`Could not update configuration for ${fileName}`)
              reject(err)
            } else {
              resolve(data.FunctionArn)
            }
          })
        }
      })
    })
  }
}
