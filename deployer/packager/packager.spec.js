/* eslint-env node, mocha */
'use strict'

const assert = require('assert')
const Packager = require('./packager')
const fs = require('fs')
const mock = require('mock-fs')

mock({
  'deployer/packages': {},
  'projects': {
    'common': {
      'data.js': 'data',
      'util.js': 'data'
    },
    'example': {
      'hello.js': 'data',
      'reflect.js': 'data'
    },
    'node_modules': {
      'somefolder': {
        'somefile.js': 'data'
      }
    }
  }
})

const createSuccessWebpack = function (config) {
  let webpack = {
    run: function (callback) {
      // create the js file in the outputFileSystem
      this.outputFileSystem.writeFileSync(`${config.output.path}/${config.output.filename}`, 'Some Content')
      callback(null, {
        toJson: () => {
          return {
            errors: [],
            warnings: []
          }
        }
      })
    }
  }
  return webpack
}

describe(`Packager Tests`, function () {
  describe(`Testing the correct number of files`, () => {
    it('Should have 4 files if 4 passed in', () => {
      let packager = new Packager('someProjectPath', 'someProjectFolder', 'somePackagePath', ['file1', 'file2', 'file3', 'file4'])
      assert(packager.files.length === 4)
    })
    it('Should have 0 files if no files passed in', () => {
      let packager = new Packager('someProjectPath', 'someProjectFolder', 'somePackagePath')
      assert(packager.files.length === 0)
    })
    it('Should have the files from getFiles', (done) => {
      let packager = new Packager('projects', 'example', 'deployer/packages', ['hello.js', 'reflect.js'])
      let filePromise = packager.getFiles()
      filePromise.then((files) => {
        assert(files[0] === 'hello.js')
        assert(files[1] === 'reflect.js')
        done()
      }).catch((err) => {
        console.log(err)
        assert.fail()
      })
    })
    it('Should have the files in project from getFiles if none provided', (done) => {
      let packager = new Packager('projects', 'example', 'deployer/packages')
      packager.getFiles().then((files) => {
        assert(files[0] === 'hello.js')
        assert(files[1] === 'reflect.js')
        done()
      }).catch((err) => {
        console.log(err)
        assert.fail()
      })
    })
  })// End testing correct number of files
  describe(`Testing Zip files`, () => {
    it('Should return a file name( no extesion ) with name of the project prepended', (done) => {
      let packager = new Packager('projects', 'example', 'deployer/packages', ['hello.js'])
      packager.setTranspiler(createSuccessWebpack)
      packager.package().then((files) => {
        assert(files[0] === 'example-hello')
        done()
      }).catch((err) => {
        console.log(err)
        assert.fail('Error packaging zip file')
      })
    })
    it('Should create a zip file of the name of the js file being packaged', (done) => {
      let packager = new Packager('projects', 'example', 'deployer/packages', ['hello.js'])
      packager.setTranspiler(createSuccessWebpack)
      packager.package().then((files) => {
        fs.readdir('deployer/packages', (err, systemFiles) => {
          if (err) {
            console.log(`ERROR reading deployer/packages ${err}`)
            assert.fail()
          } else {
            assert(systemFiles.indexOf('example-hello.zip') > -1)
            done()
          }
        })
      }).catch((err) => {
        console.log(err)
        assert.fail('Error packaging zip file')
      })
    })
    it('Should create a zip file for each lambda function passed in', (done) => {
      let packager = new Packager('projects', 'example', 'deployer/packages', ['hello.js', 'reflect.js'])
      packager.setTranspiler(createSuccessWebpack)
      packager.package().then((files) => {
        fs.readdir('deployer/packages', (err, systemFiles) => {
          if (err) {
            console.log(err)
            assert.fail()
          } else {
            assert(systemFiles.indexOf('example-hello.zip') > -1)
            assert(systemFiles.indexOf('example-reflect.zip') > -1)
            done()
          }
        })
      }).catch((err) => {
        console.log(err)
        assert.fail('Error packaging zip file')
      })
    })
    it('Should create a zip file for each lambda function in the example folder if no files specified', function (done) {
      let packager = new Packager('projects', 'example', 'deployer/packages')
      packager.setTranspiler(createSuccessWebpack)
      packager.package().then((files) => {
        fs.readdir('deployer/packages', (err, systemFiles) => {
          if (err) {
            console.log(err)
            assert.fail()
          } else {
            assert(systemFiles.indexOf('example-hello.zip') > -1)
            assert(systemFiles.indexOf('example-reflect.zip') > -1)
            done()
          }
        })
      }).catch((err) => {
        console.log(err)
        assert.fail('Error packaging zip file')
      })
    })
  })
})
