'use strict'

/**
 * @description A class that takes 1 or more Lambda files, or a folder of Lambda files,
 *    zips each one along with its dependencies and stores it in the specified folder
 *    files are prepended with the project folder they are in, ex. /example/hello.js => example-hello.js
*/

const archiver = require('archiver')
const fs = require('fs')
const MemoryFs = require('memory-fs')
const webpack = require('webpack')

module.exports = class Packager {
  /**
   * Packager
   * @constructor
   * @param {string} projectPath - the path to the folder that holds all projects
   * @param {string} projectFolder - the folder name of the project to package
   * @param {string} packagePath - the path to the packages folder
   * @param {Array} files - if empty, packages all Lambda functions in pathToFolder, otherwise packages any in list
   */
  constructor (projectPath, projectFolder, packagePath, files = []) {
    this.path = projectPath
    this.project = projectFolder
    this.packagePath = packagePath
    this.files = files

    // use webpack to transpile into a single file
    this.createTranspiler = (config) => {
      return webpack(config)
    }
  }

  /**
   * Use this to set the transpiler, or a mock transpiler for unit testing
   * @param {function} createFunc
   */
  setTranspiler (createFunc) {
    this.createTranspiler = createFunc
  }

  /*
    take all the files in the files array and zip them with their dependencies
    @returns a reference to the zipped file
  */
  async package () {
    this.files = await this.getFiles()
    var promises = this.files.map((file) => {
      return this.zipPackage(file)
    })
    return Promise.all(promises)
  }

  /**
   * takes a lambda function file relative to projectPath and projectName
   * uses webpack to transpile it into a single file
   * @param {string} file
   * @returns the name of the zipped file
   */
  async zipPackage (file) {
    return new Promise((resolve, reject) => {
      const fileName = file.replace(/.js/g, '')
      const zipFileName = `${this.project}-${fileName}`

      var output = fs.createWriteStream(`${this.packagePath}/${zipFileName + '.zip'}`)
      var archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', function () {
        // return the name of the file that was zipped
        resolve(`${zipFileName}`)
      })

      output.on('end', function () {

      })

      archive.on('warning', function (err) {
        console.log('ARCHIVE WARNING')
        console.log(err)
      })

      archive.on('error', function (err) {
        if (err.code === 'ENOENT') {
          console.log('ARCHIVE ERROR')
          console.log(err)
        } else {
          reject(err)
        }
      })

      archive.pipe(output)

      // Store the compiled JS file into memory in /compiled
      const memFs = new MemoryFs()
      memFs.mkdirpSync('/compiled')

      // setup webpack config - we ignore aws sdk because
      //  Lambda functions running on AWS already have access to aws sdk
      var compiler = this.createTranspiler({
        mode: 'production',
        target: 'node',
        context: this.path,
        entry: `${this.path}/${this.project}/${file}`,
        output: {
          filename: `${zipFileName}.js`,
          path: '/compiled',
          library: zipFileName,
          libraryTarget: 'umd'
        },
        externals: {
          'aws-sdk': 'commonjs aws-sdk'
        }
      })

      // here we assign the output file system to our in-memory stream
      compiler.outputFileSystem = memFs
      compiler.run((err, stats) => {
        if (err) {
          console.log('WEBPACK ERROR')
          console.log(err)
          reject(err)
        } else {
          var jstats = stats.toJson()
          var hasErrors = false
          if (jstats.errors.length > 0) {
            console.log('WEBPACK COMPILE ERROR')
            console.log(jstats.errors)
            hasErrors = true
            reject(jstats.errors)
          }
          if (jstats.warnings.length > 0) {
            console.log('WEBPACK COMPILE WARNING')
            console.log(jstats.warnings)
            hasErrors = true
          }
          if (!hasErrors) {
            // write the results of the webpacked js file to the archive
            archive.append(memFs.createReadStream(`/compiled/${zipFileName}.js`), { name: zipFileName + '.js' })
            archive.finalize()
          } else {
            archive.abort()
            reject(new Error(`Could not archive ${this.path}/${this.project}/${file}`))
          }
        }
      })
    })
  }

  // this function returns the list of files that we already have,
  // or it fills the files array with a list of files from the folder passed in
  // @returns [string]
  async getFiles () {
    if (this.files.length > 0) {
      return this.files
    } else {
      return new Promise((resolve, reject) => {
        fs.readdir(`${this.path}/${this.project}`, (err, systemFiles) => {
          if (err) {
            reject(err)
          } else {
            resolve(systemFiles.filter((file) => { return file.endsWith('.js') && !file.endsWith('.spec.js') }))
          }
        })
      })
    }
  }
}
