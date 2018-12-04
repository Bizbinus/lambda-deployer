/* eslint-env node, mocha */
'use strict'

const assert = require('assert')
const Deployer = require('./deployer')

var mockLambda = {
  // default getFunction simulates success
  getFunction: (params, callback) => {
    callback(null, {})
  },
  // default createFunction simulates a create
  createFunction: (params, callback) => {
    callback(null, {})
  },
  createAlias: (params, callback) => {
    callback(null, { AliasArn: 'some-alias-arn' })
  },
  updateFunctionCode: (params, callback) => {
    callback(null, {})
  },
  updateFunctionConfiguration: (params, callback) => {
    callback(null, { FunctionArn: 'some-function-arn' })
  }
}

describe('Deployer Tests', async () => {
  before(() => {
    this.defaultMeta = {
      Runtime: 'default meta',
      Tags: {
        'Tag1': 'DefaultTag',
        'Default': 'Tag'
      },
      Environment: {
        Variables: {
          'DEFAULT_VAR': 'Default',
          'VAR': 'Default'
        }
      },
      VpcConfig: {
        external: {
          SubnetIds: ['extSub1', 'extSub2'],
          SecurityGroupIds: ['extGroup1', 'extGroup2']
        },
        internal: {
          SubnetIds: ['intSub1', 'intSub2'],
          SecurityGroupIds: ['intGroup1', 'intGroup2']
        },
        internalWithNAT: {
          SubnetIds: ['natSub1', 'natSub2'],
          SecurityGroupIds: ['natGroup1', 'natGroup2']
        }
      }
    }

    this.envMeta = {
      Runtime: 'env meta',
      VpcConfig: {
        SubnetIds: ['env100', 'env102'],
        SecurityGroupIds: ['env1', 'env2']
      },
      Tags: {
        'Tag1': 'EnvTag',
        'Env': 'Tag'
      },
      Environment: {
        Variables: {
          'ENV_VAR': 'Env',
          'VAR': 'Env'
        }
      }
    }

    this.funcMeta = {
      Runtime: 'func meta',
      VpcConfig: {
        SubnetIds: ['func100', 'func102'],
        SecurityGroupIds: ['func1', 'func2']
      },
      Tags: {
        'Tag1': 'FuncTag',
        'Func': 'Tag'
      },
      Environment: {
        Variables: {
          'FUNC_VAR': 'Function',
          'VAR': 'Function'
        }
      }
    }

    this.funcMetaWithVpcString = {
      Runtime: 'func meta',
      VpcConfig: 'external',
      Tags: {
        'Tag1': 'FuncTag',
        'Func': 'Tag'
      },
      Environment: {
        Variables: {
          'FUNC_VAR': 'Function',
          'VAR': 'Function'
        }
      }
    }

    this.funcMetaWithoutVpc = {
      Runtime: 'func meta',
      Tags: {
        'Tag1': 'FuncTag',
        'Func': 'Tag'
      },
      Environment: {
        Variables: {
          'FUNC_VAR': 'Function',
          'VAR': 'Function'
        }
      }
    }

    this.funcConfig = {
      FunctionName: 'Function-1',
      Handler: `Function-1.handler`,
      Publish: false,
      Code: {
        ZipFile: 'Content'
      },
      VpcConfig: {
        SubnetIds: ['subnet1', 'subnet2'],
        SecurityGroupIds: ['group1', 'group2']
      }
    }
  })
  describe('Meta Merging Tests', () => {
    it('Should merge meta objects in the order of default, environment, and function', () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      let metaResults = deployer.mergeMetas(this.defaultMeta, this.envMeta, this.funcMeta)

      assert(metaResults.Runtime === 'func meta')
      assert(metaResults.VpcConfig.SubnetIds[0] === 'func100')
      assert(metaResults.VpcConfig.SecurityGroupIds[1] === 'func2')
      assert(metaResults.Tags['Tag1'] === 'FuncTag')
      assert(metaResults.Environment.Variables['VAR'] === 'Function')
    })
    it('Should merge unique Tags and Environment.Variables on final results', () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      let metaResults = deployer.mergeMetas(this.defaultMeta, this.envMeta, this.funcMeta)

      assert(metaResults.Tags['Default'] === 'Tag')
      assert(metaResults.Tags['Env'] === 'Tag')
      assert(metaResults.Tags['Func'] === 'Tag')
      assert(metaResults.Environment.Variables['FUNC_VAR'] === 'Function')
      assert(metaResults.Environment.Variables['ENV_VAR'] === 'Env')
      assert(metaResults.Environment.Variables['DEFAULT_VAR'] === 'Default')
    })
    it('Should provide default values if enviornment and function meta are null', () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      let metaResults = deployer.mergeMetas(this.defaultMeta, null, null)

      assert(metaResults.Runtime === 'default meta')
      assert(metaResults.VpcConfig.external.SubnetIds[0] === 'extSub1')
      assert(metaResults.VpcConfig.external.SecurityGroupIds[1] === 'extGroup2')
      assert(metaResults.Tags['Tag1'] === 'DefaultTag')
      assert(metaResults.Environment.Variables['VAR'] === 'Default')
    })
    it('Should provide env values if present and function meta is not', () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      let metaResults = deployer.mergeMetas(this.defaultMeta, this.envMeta, null)

      assert(metaResults.Runtime === 'env meta')
      assert(metaResults.VpcConfig.SubnetIds[0] === 'env100')
      assert(metaResults.VpcConfig.SecurityGroupIds[1] === 'env2')
      assert(metaResults.Tags['Tag1'] === 'EnvTag')
      assert(metaResults.Environment.Variables['VAR'] === 'Env')
    })
  })
  describe('Function config merging tests', () => {
    it('Should merge function config with meta, where function config overrides meta properties', () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      let metaResults = deployer.mergeMetas(this.defaultMeta, this.envMeta, this.funcMeta)
      let configResults = deployer.mergeMetaWithConfig(metaResults, this.funcConfig)

      assert(configResults.FunctionName === 'Function-1')
      assert(configResults.Handler === 'Function-1.handler')
      assert(configResults.Publish === false)
      assert(configResults.Code.ZipFile === 'Content')
      assert(configResults.VpcConfig.SubnetIds[0] === 'subnet1')
      assert(configResults.VpcConfig.SecurityGroupIds[1] === 'group2')
      assert(configResults.Runtime === 'func meta')
      assert(configResults.Tags['Tag1'] === 'FuncTag')
      assert(configResults.Environment.Variables['FUNC_VAR'] === 'Function')
    })
    it('Should select a vpc config property from lambda config if Function meta.VpcConfig is a string', () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      let metaResults = deployer.mergeMetas(this.defaultMeta, null, this.funcMetaWithVpcString)

      metaResults.VpcConfig = 'external'
      let vpcConfig = deployer.getVpcConfig(this.defaultMeta, null, metaResults)
      assert(vpcConfig.SubnetIds[0] === 'extSub1')
      assert(vpcConfig.SecurityGroupIds[1] === 'extGroup2')

      metaResults.VpcConfig = 'internal'
      vpcConfig = deployer.getVpcConfig(this.defaultMeta, null, metaResults)
      assert(vpcConfig.SubnetIds[0] === 'intSub1')
      assert(vpcConfig.SecurityGroupIds[1] === 'intGroup2')

      metaResults.VpcConfig = 'internalWithNAT'
      vpcConfig = deployer.getVpcConfig(this.defaultMeta, null, metaResults)
      assert(vpcConfig.SubnetIds[0] === 'natSub1')
      assert(vpcConfig.SecurityGroupIds[1] === 'natGroup2')
    })
    it(`Should select function's vpc config if provided`, () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      let metaResults = deployer.mergeMetas(this.defaultMeta, this.envMeta, this.funcMeta)
      let vpcConfig = deployer.getVpcConfig(this.defaultMeta, null, metaResults)

      assert(vpcConfig.SubnetIds[0] === 'func100')
      assert(vpcConfig.SecurityGroupIds[1] === 'func2')
    })
    it(`Should select default external vpc if none specified in function or environment.`, () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      let metaResults = deployer.mergeMetas(this.defaultMeta, null, this.funcMetaWithoutVpc)
      let vpcConfig = deployer.getVpcConfig(this.defaultMeta, null, metaResults)

      assert(vpcConfig.SubnetIds[0] === 'extSub1')
      assert(vpcConfig.SecurityGroupIds[1] === 'extGroup2')
    })
  })
  describe('Lambda Deployment Tests', async () => {
    it(`Should find existing lambda`, async () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      deployer.setCreateAwsLambda(function () { return mockLambda })
      let results = await deployer.lambdaExists('some-lambda-file')
      console.log(results)
      assert(results === true)
    })
    it(`Should not find lambda that doesn't exist`, async () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      mockLambda.getFunction = (params, callback) => {
        callback(new Error('Could not find lambda function'))
      }
      deployer.setCreateAwsLambda(function () { return mockLambda })
      let results = await deployer.lambdaExists('some-lambda-file')

      assert(results === false)
    })
    it(`Should create a new function if lambda doesn't exist`, async () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      // implement mock data for all functions used in the runDeploy function
      deployer.getFunctionMeta = (fileName) => {
        return {
          Runtime: 'func meta',
          VpcConfig: {
            SubnetIds: ['func100', 'func102'],
            SecurityGroupIds: ['func1', 'func2']
          },
          Tags: {
            'Tag1': 'FuncTag',
            'Func': 'Tag'
          },
          Environment: {
            Variables: {
              'FUNC_VAR': 'Function',
              'VAR': 'Function'
            }
          }
        }
      }
      deployer.getVpcConfig = () => {
        return {
          SubnetIds: ['env100', 'env102'],
          SecurityGroupIds: ['env1', 'env2']
        }
      }
      deployer.getZipContent = () => {
        return 'content'
      }
      deployer.mergeMetas = () => {
        return {
          Runtime: 'func meta',
          VpcConfig: {
            SubnetIds: ['func100', 'func102'],
            SecurityGroupIds: ['func1', 'func2']
          },
          Tags: {
            'Tag1': 'FuncTag',
            'Func': 'Tag'
          },
          Environment: {
            Variables: {
              'FUNC_VAR': 'Function',
              'VAR': 'Function'
            }
          }
        }
      }
      // simulate can't find function
      mockLambda.getFunction = (params, callback) => {
        callback(new Error('Could not find lambda function'))
      }
      deployer.setCreateAwsLambda(() => { return mockLambda })
      let results = await deployer.runDeploy('some-file')

      assert(results === 'some-alias-arn')
    })
    it(`Should update a function if lambda exists`, async () => {
      let deployer = new Deployer('some path', 'some project', 'some package', [])
      // implement mock data for all functions used in the runDeploy function
      deployer.getFunctionMeta = (fileName) => {
        return {
          Runtime: 'func meta',
          VpcConfig: {
            SubnetIds: ['func100', 'func102'],
            SecurityGroupIds: ['func1', 'func2']
          },
          Tags: {
            'Tag1': 'FuncTag',
            'Func': 'Tag'
          },
          Environment: {
            Variables: {
              'FUNC_VAR': 'Function',
              'VAR': 'Function'
            }
          }
        }
      }
      deployer.getVpcConfig = () => {
        return {
          SubnetIds: ['env100', 'env102'],
          SecurityGroupIds: ['env1', 'env2']
        }
      }
      deployer.getZipContent = () => {
        return 'content'
      }
      deployer.mergeMetas = () => {
        return {
          Runtime: 'func meta',
          VpcConfig: {
            SubnetIds: ['func100', 'func102'],
            SecurityGroupIds: ['func1', 'func2']
          },
          Tags: {
            'Tag1': 'FuncTag',
            'Func': 'Tag'
          },
          Environment: {
            Variables: {
              'FUNC_VAR': 'Function',
              'VAR': 'Function'
            }
          }
        }
      }
      // simulate can't find function
      mockLambda.getFunction = (params, callback) => {
        callback(null, {})
      }
      deployer.setCreateAwsLambda(() => { return mockLambda })
      let results = await deployer.runDeploy('some-file')

      assert(results === 'some-function-arn')
    })
  })
})
