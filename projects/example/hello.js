

var mysql = require('mysql');

var util = require('./common/util.js');
var data = require('./common/data.js');


exports.meta = {
  description: `Returns 'hello' as a message.`,
  memory: 128,
  timeout: 15,
  vpc: {
    SubnetIds: [],
    SecurityGroupIds: []
  }
}


exports.handler = (event, context, callback) => {

  util.returnSuccess(null, {message: 'Hello from Lambda!'}, callback);
  

}

