

var mysql = require('mysql');

var util = require('./common/util.js');
var data = require('./common/data.js');


exports.meta = {
  description: `Returns any object passed in.`,
  vpc: data.vpc.external
}


exports.handler = (event, context, callback) => {

  try {

    util.returnSuccess(null, JSON.parse(event.body), callback);

  } catch(err) {

    util.returnError(null, err, data.status.BadRequest, {message: 'Error parsing object.'}, callback);

  }

}

