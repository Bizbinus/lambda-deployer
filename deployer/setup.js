'use strict'

const fs = require('fs')

fs.createReadStream('./config/.template-env').pipe(fs.createWriteStream('./config/env/local/.env'))
fs.createReadStream('./config/.template-env').pipe(fs.createWriteStream('./config/env/dev/.env'))
fs.createReadStream('./config/.template-env').pipe(fs.createWriteStream('./config/env/staging/.env'))
fs.createReadStream('./config/.template-env').pipe(fs.createWriteStream('./config/env/production/.env'))
fs.createReadStream('./config/.template-lambda-json').pipe(fs.createWriteStream('./config/env/lambda-default.json'))
fs.createReadStream('./config/.template-lambda-json').pipe(fs.createWriteStream('./config/env/production/lambda.json'))
