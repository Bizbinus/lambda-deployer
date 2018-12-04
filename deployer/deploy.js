'use strict'

const Packager = require('./packager')
const Deployer = require('./deployer')
const fs = require('fs')
const path = require('path')

if (process.argv.length > 2) {
  let projectFolder = process.argv[3] // our parameters start at index 4
  let projectsDir = path.join(__dirname, '../projects')
  let packagePath = path.join(__dirname, '/packages')

  fs.stat(`${projectsDir}/${projectFolder}`, function (err, stats) {
    if (err) {
      console.log('Error retrieving project')
    } else {
      if (stats.isDirectory) {
        // if we don't have any further arguments, then deploy all files in this project
        var files = []
        if (process.argv.length > 4) {
          var nameIndex = 4// names of lambda functions start here
          var fileName = validateJSFile(process.argv[nameIndex])
          while (fileName != null) {
            files.push(fileName)
            nameIndex++
            fileName = validateJSFile(process.argv[nameIndex])
          }
        }

        let packager = new Packager(projectsDir, projectFolder, packagePath, files)
        packager.package().then((results) => {
          console.log(results)
          let deployer = new Deployer(projectsDir, projectFolder, packagePath, results)
          deployer.deploy()
        })
      } else {
        console.log(`Project ${projectFolder} is not a folder.`)
      }
    }
  })
} else {
  console.log('You need to specify a project name')
}

function validateJSFile (fileName) {
  if (fileName != null) {
    if (fileName.endsWith('.js')) {
      return fileName
    } else {
      return `${fileName}.js`
    }
  }
  return fileName
}
