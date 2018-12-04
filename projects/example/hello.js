'use strict'

/**
 * The meta object allows you to provide more customized settings for this specific Lambda function
 *  Any variables not defined in the meta object will use the default values defined in the config.js file
 */
exports.meta = {
  Description: `Returns 'hello' as a message and provides example meta object.`,
  MemorySize: 128,
  Timeout: 15,
  Runtime: 'nodejs8.10',
  Environment: {
    Variables: {
      'NAME': 'Gail'
    }
  },
  Tags: {
    'events': 'api',
    'business': 'Gail Sparks'
  },
  VpcConfig: {
    SubnetIds: [],
    SecurityGroupIds: []
  }
}

exports.handler = async (event, context) => {
  return `Hello, ${process.env.NAME}, from Lambda!`
}
