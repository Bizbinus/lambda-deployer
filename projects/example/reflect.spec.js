/* eslint-env node, mocha */
'use strict'

let assert = require('assert')
let reflect = require('./reflect')

describe('Reflect Tests', async () => {
  it('Should return the same object passed in through the event', async () => {
    let event = {
      body: JSON.stringify({
        name: 'Test 1',
        value: 1,
        list: [1, 2, 3]
      })
    }
    let response = await reflect.handler(event, {})
    assert(response.name === 'Test 1')
    assert(response.value === 1)
    assert(response.list.length === 3)
    assert(response.list[0] === 1)
    assert(response.list[1] === 2)
    assert(response.list[2] === 3)
  })
  it(`Should throw an error if event doesn't have a body object`, async () => {
    try {
      await reflect.handler({}, {})
    } catch (error) {
      assert(error != null)
    }
  })
})
