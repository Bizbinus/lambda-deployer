/* eslint-env node, mocha */
'use strict'

const assert = require('assert')
const hello = require('./hello')

describe('Hello Lambda test', async () => {
  before(() => {
    let meta = hello.meta
    if (meta.Environment && meta.Environment.Variables) {
      let keys = Object.keys(meta.Environment.Variables)
      keys.forEach(function (k) {
        process.env[k] = meta.Environment.Variables[k]
      })
    }
  })
  it(`Should return 'Hello, Gail, from Lambda!'`, async () => {
    let results = await hello.handler({}, {})
    console.log(results)
    assert(results === 'Hello, Gail, from Lambda!')
  })
})
