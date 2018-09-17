


module.exports = {
  logError: function(data) {
    console.log();
    console.log(`\x1b[31m%s\x1b[0m`, data);
  },
  logSuccess: function(data) {
    console.log();
    console.log(`\x1b[32m%s\x1b[0m`, data);
    console.log();
  },
  logWarning: function(data) {
    console.log();
    console.log(`\x1b[33m%s\x1b[0m`, data);
    console.log();
  },
  logMessage: function(message) {
    console.log(message)
    console.log();
  }
}

