
//rename this file to config.js
//make sure it's added to your .gitignore file
//so your sensitive information doesn't get uploaded to
//a repository.
module.exports = {
  stage: {
    local: {
      mysql: {
          host: '',
          user: '',
          password: '',
          database: ''
      }
    },
    dev: {
      mysql: {
        host: '',
        user: '',
        password: '',
        database: ''
      }
    },
    prod: {
      mysql: {
        host: '',
        user: '',
        password: '',
        database: ''
      }
    }
  },
  aws: {
    profile: 'Name of profile in your .aws/Credentials file.',
    region: 'The region where your Lambda Functions are located.',
    accountNumber: 'Your AWS account number here.',
    apiNumber: '',
    function: {
      initialStage: 'dev',
      default: {
        memory: 128,
        timeout: 20,
        role: 'Lambda Function role name you setup in IAM.',
        vpc: {
          external: {//Lambda Functions default to this behavior, so don't specify any values
            SubnetIds: [
            ],
            SecurityGroupIds: [
            ]
          },
          internal: {
            SubnetIds: [
            ],
            SecurityGroupIds: [
            ]
          },
          internalWithNAT: {
            SubnetIds: [
            ],
            SecurityGroupIds: [
            ]
          }
        }
      },
      dev: {
        
      },
      staging: {
      },
      production: {
        memory: 512,
        timeout: 30
      }
    }
  }
}







