'use strict'

var data = require('../common/data')
/**
 * The meta object allows you to provide more customized settings for this specific Lambda function
 *  Any variables not defined in the meta object will use the default values defined in the config.js file
 */
exports.meta = {
  Description: `Returns the object passed in through the event.body.`,
  VpcConfig: data.vpc.external
}

exports.handler = async (event, context) => {
  return JSON.parse(event.body)
}
