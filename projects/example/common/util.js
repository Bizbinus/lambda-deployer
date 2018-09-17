
var aws;
try {
    aws = require("aws-sdk");
    aws.config.region = "us-west-2";
} catch(e) {

}

var data = require('./data.js');

module.exports = {
  allow: '',
  wrapResponse: function(status, bodyObject) {
    const resp = {
        statusCode: status,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': this.allow
        },
        body: JSON.stringify(bodyObject)
    };

    return resp;
  },
  returnError: function(con, err, responseCode,  message, callback) {
    this.logError(err)
    callback(null, this.wrapResponse(responseCode, classes.ErrorMessage.new('', message)));
    if (con != null) {
      con.end();
    }
  },
  returnSuccess: function(con, obj, callback) {
    callback(null, this.wrapResponse(data.status.OK, obj));
    if (con != null) {
      con.end();
    }
  },
  wrapRedirect: function(location) {
    const resp = {
        statusCode: data.status.Redirect,
        headers: {
            'Location': location
        }
    };

    return resp;
  },
  decodeStageVariables: function(stageVariablesObject) {

    var obj = {}

    Object.keys(stageVariablesObject).forEach(function(key, index) {
      obj[key] = module.exports.decodeBase64String(stageVariablesObject[key]);
    });

    return obj;
  },
  decodeBase64String: function(str) {
    let data = str;
    let buff = new Buffer(data, 'base64');
    let text = buff.toString("ascii");
    
    return JSON.parse(text);
  },
  propertyName: function(obj, prop) {
    for(var i in obj) {
      if (typeof(obj[i]) == 'object') {
        return exports.propertyName(obj[i], prop);
      } else {
        if (obj[i] == prop) {
          return i;
        }
      }
    }
  },
  logError: function(msg) {
    console.log(msg);
  },
  logMessage: function(msg) {
    console.log(msg);
  }

}


