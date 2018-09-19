
var fs = require('fs');
var aws = require('aws-sdk');
var archiver = require('archiver');
var config = require('./config.js');
var util = require('./util.js');

console.log();

var credentials = new aws.SharedIniFileCredentials({profile: config.aws.profile});
aws.config.credentials = credentials;
aws.config.update({
    region: config.aws.region
});

var projectDir = '../projects';

if (process.argv.length > 2) {

  var projectName = process.argv[2];//name of project to work from
  
  //let's make sure this project exists
  fs.stat(`${projectDir}/${projectName}`, function(err, stats) {

    if (err) {
      util.logError('Error retrieving project');
    } else {

      if (stats.isDirectory) {

          //good to go
          //if we don't have any further arguments, then deploy all files in this project
          if (process.argv.length == 3) {

            fs.readdir(`${projectDir}/${projectName}`, function(err, files) {

              files.forEach(function(file) {
                if (file.endsWith(".js")) {
                  packageLambda(file, projectName);
                }
              });
  
            });

          } else {

            var nameIndex = 3;//names of lambda functions start here
    
            var fileName = validateFile(process.argv[nameIndex]);
          
            while(fileName != null) {
          
              packageLambda(fileName, projectName);
          
              nameIndex++;
              fileName = validateFile(process.argv[nameIndex]);
              
            }
          }

      } else {
        util.logWarning(`Project ${projectName} is not a folder.`);
      }


    }

  });
  
  
  
} else {
    
  util.logWarning('Please specify a project name to deploy.');
    
}

function validateFile(fileName) {

  if (fileName != null) {

    if (fileName.endsWith('.js')) {
      return fileName;
    } else {
      return fileName+'.js';
    }
  }

  return fileName;

}



function packageLambda(file, project) {

  util.logMessage(`Packaging ${project}/${file}`);
    
      
  var output = fs.createWriteStream(`${__dirname}/packages/${file.replace(/.js/g, '.zip')}`);
  var archive = archiver('zip', {zlib: {level: 9}});
  
  output.on('close', function() {

    util.logMessage(`Finished packaging ${file}`);
    deployFile(file.replace(/.js/g, ''), project);

  });

  output.on('end', function() {
      util.logMessage('output end');
  });
  
  archive.on('warning', function(err) {
      if (err.code == 'ENOENT') {
          util.logError(err);
      } else {
          throw err;
      }
  });

  archive.on('error', function(err) {
      throw err;
  });

  archive.pipe(output);

  //add the file to the zip
  archive.append(fs.createReadStream(`${projectDir}/${project}/${file}`), { name: file});
  try {
    //add the common folder to the zip
    archive.directory(`${projectDir}/${project}/common`, 'common');
  } catch(err) {

  }
  try {
    //add all the modules
    archive.directory(`${projectDir}/${project}/node_modules`, 'node_modules');
  } catch(err) {

  }

  archive.finalize();
  



}


function deployFile(fileName, project) {

    util.logMessage(`Deploying package ${project}-${fileName}`);

    var zipContent = null;
    
    try {
        zipContent = fs.readFileSync(`packages/${fileName}.zip`);
    } catch(err) {

        util.logError(err);
    }
    if (zipContent) {
        var file = fileName+'.js';

        //we will use AWS sdk to deploy Lambda Functions
        var lambda = new aws.Lambda();


        var meta = null;
        try {
          //get the meta object from the lambda function file
          meta = require(`${projectDir}/${project}/${file}`).meta;
          
        } catch(err) {
          util.logWarning(`Could not retreive meta object`);
          util.logMessage(err);
        }

  

        var getParams = {
            FunctionName: `${project}-${fileName}`
        }

        
        //first see if the function exists
        lambda.getFunction(getParams, function(err, data) {
          if (err) {
            util.logMessage('Could not create Lambda Function. Attempting to create...');

            deployNew(fileName, project, meta, zipContent);
               
          } else {
            
            deployUpdate(fileName, project, meta, zipContent);

          }
            
        });
        
    } else {
        util.logError(`no file found at packages/${fileName}`);
    }

}

function getParams(meta) {

  var functionConfig = config.aws.function;
  var stage = config.aws.initialStage;

  var role = functionConfig.default.role;

  if (meta && meta.role) {
    role = meta.role;
  } else if (functionConfig[stage].role) {
    role = functionConfig[stage].role;
  }

  var timeout = functionConfig.default.timeout;
  if (meta && meta.timeout) {
    timeout = meta.timeout;
  } else if (functionConfig[stage].timeout) {
    timeout = functionConfig[stage].timeout;
  }

  var memory = functionConfig.default.memory;
  if (meta && meta.memory) {
    memory = meta.memory;
  } else if (functionConfig[stage].memory) {
    memory = functionConfig[stage].memory;
  }

  var vpc = functionConfig.default.vpc.external;
  if (meta && typeof(meta.vpc) == 'string')  {
    //if meta.vpc is a string, then pull the vpc from the default or stage.
    vpc = functionConfig.default.vpc[meta.vpc];

    if (functionConfig[stage].vpc && functionConfig[stage].vpc[meta.vpc]) {
      vpc = functionConfig[stage].vpc[meta.vpc];
    }
  } else if (meta && typeof(meta.vpc) == 'object') {
    //if meta.vpc is an object, then a vpc is defined on the Lambda Function
    vpc = meta.vpc;

  } else if (functionConfig[stage].vpc) {
    vpc = functionConfig[stage].vpc;
  }

  return {
    Runtime: 'nodejs6.10',
    Role: `arn:aws:iam::${config.aws.accountNumber}:role/${role}`,
    Timeout: timeout,
    MemorySize: memory,
    VpcConfig: vpc
  }


}


function deployNew(fileName, project, meta, zipContent) {

  var lambda = new aws.Lambda();

  var params = getParams(meta);
  params.FunctionName = `${project}-${fileName}`;
  params.Handler = `${fileName}.handler`;
  params.Publish = false;
  params.Code = {
    ZipFile: zipContent
  }

  lambda.createFunction(params, function(err, data) {
    if (err) {
      util.logError(`Could not create Lambda Function: ${project}/${fileName}`);
     
    
    } else {
      util.logSuccess(`Lambda Function ${project}-${fileName} created successfully!`);

      //create the alias
      var alias = {
        FunctionName: params.FunctionName,
        FunctionVersion: `$LATEST`,
        Name: config.aws.initialStage
      };

      lambda.createAlias(alias, function(err, data) {
        if (err) {
            util.logError(`Could not create alias`);
            util.logMessage(err);
        } else {
    
          util.logSuccess(`${project}-${fileName} created at ${data.AliasArn}`);
          
        }
      });

    }
  });

}

function deployUpdate(fileName, project, meta, zipContent) {

  var lambda = new aws.Lambda();
  var updateParams = {
      FunctionName: `${project}-${fileName}`,
      Publish: false,
      ZipFile: zipContent 
  }

  var configParams = getParams(meta);
  configParams.FunctionName = `${project}-${fileName}`;


  lambda.updateFunctionCode(updateParams, function(err, data) {
    if (err) {

      util.logError(`Could not update function code`);
      util.logMessage(err);

    
    } else {
        
      lambda.updateFunctionConfiguration(configParams, function(err, data) {
        if (err) {
          util.logError(`Could not update function configuration`);
          util.logMessage(err);

        } else {
          util.logSuccess(`Lambda function updated at ${data.FunctionArn}`);
          
        }
      });
      
    }
    
  });

}


