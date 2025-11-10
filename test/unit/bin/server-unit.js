/*
  Unit tests for Server class.
  Note: Full server testing requires integration tests due to ES module limitations.
  These tests focus on testable logic.
*/

// npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Unit under test
import Server from '../../../bin/server.js'

describe('#server.js', () => {
  let sandbox
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new Server()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#startServer()', () => {
    // Note: Full server startup testing requires integration tests
    // due to ES module import limitations with Express and Controllers
    it('should have startServer method', () => {
      assert.isFunction(uut.startServer)
    })

    it('should have controllers property', () => {
      assert.property(uut, 'controllers')
    })

    it('should have config property', () => {
      assert.property(uut, 'config')
    })
  })

  describe('#sleep()', () => {
    it('should sleep for specified milliseconds', async () => {
      const start = Date.now()
      await uut.sleep(50)
      const end = Date.now()

      // Should have slept at least 50ms (allowing some margin)
      assert.isAtLeast(end - start, 40)
    })
  })

  describe('#constructor()', () => {
    it('should initialize with controllers and config', () => {
      const server = new Server()

      assert.property(server, 'controllers')
      assert.property(server, 'config')
      assert.property(server, 'process')
    })
  })
})
