/*
  Unit tests for ControlRESTController.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import ControlRESTController from '../../../src/controllers/rest-api/full-node/control/controller.js'
import { createMockRequest, createMockResponse } from '../mocks/controller-mocks.js'

describe('#control-controller.js', () => {
  let sandbox
  let mockAdapters
  let mockUseCases
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {}
    mockUseCases = {
      control: {
        getNetworkInfo: sandbox.stub().resolves({ version: 1 })
      }
    }

    uut = new ControlRESTController({
      adapters: mockAdapters,
      useCases: mockUseCases
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#constructor()', () => {
    it('should require adapters', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new ControlRESTController({ useCases: mockUseCases })
      }, /Adapters library required/)
    })

    it('should require control use cases', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new ControlRESTController({ adapters: mockAdapters, useCases: {} })
      }, /Control use cases required/)
    })
  })

  describe('#root()', () => {
    it('should return control status', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.root(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { status: 'control' })
    })
  })

  describe('#getNetworkInfo()', () => {
    it('should return network info on success', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getNetworkInfo(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { version: 1 })
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('failure')
      error.status = 503
      mockUseCases.control.getNetworkInfo.rejects(error)
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getNetworkInfo(req, res)

      assert.equal(res.statusValue, 503)
      assert.deepEqual(res.jsonData, { error: 'failure' })
    })
  })
})
