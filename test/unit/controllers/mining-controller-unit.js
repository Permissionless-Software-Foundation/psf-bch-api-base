/*
  Unit tests for MiningRESTController.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import MiningRESTController from '../../../src/controllers/rest-api/full-node/mining/controller.js'
import { createMockRequest, createMockResponse } from '../mocks/controller-mocks.js'

describe('#mining-controller.js', () => {
  let sandbox
  let mockAdapters
  let mockUseCases
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {}
    mockUseCases = {
      mining: {
        getMiningInfo: sandbox.stub().resolves({ blocks: 100, difficulty: 1.5 }),
        getNetworkHashPS: sandbox.stub().resolves(1234567890)
      }
    }

    uut = new MiningRESTController({
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
        new MiningRESTController({ useCases: mockUseCases })
      }, /Adapters library required/)
    })

    it('should require mining use cases', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new MiningRESTController({ adapters: mockAdapters, useCases: {} })
      }, /Mining use cases required/)
    })
  })

  describe('#root()', () => {
    it('should return mining status', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.root(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { status: 'mining' })
    })
  })

  describe('#getMiningInfo()', () => {
    it('should return mining info on success', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getMiningInfo(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { blocks: 100, difficulty: 1.5 })
      assert.isTrue(mockUseCases.mining.getMiningInfo.calledOnce)
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('failure')
      error.status = 503
      mockUseCases.mining.getMiningInfo.rejects(error)
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getMiningInfo(req, res)

      assert.equal(res.statusValue, 503)
      assert.deepEqual(res.jsonData, { error: 'failure' })
    })
  })

  describe('#getNetworkHashPS()', () => {
    it('should return network hash PS with default params', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getNetworkHashPS(req, res)

      assert.equal(res.statusValue, 200)
      assert.equal(res.jsonData, 1234567890)
      assert.isTrue(mockUseCases.mining.getNetworkHashPS.calledOnce)
      assert.deepEqual(mockUseCases.mining.getNetworkHashPS.firstCall.args[0], {
        nblocks: 120,
        height: -1
      })
    })

    it('should parse query params for nblocks and height', async () => {
      const req = createMockRequest({
        query: {
          nblocks: '240',
          height: '1000'
        }
      })
      const res = createMockResponse()

      await uut.getNetworkHashPS(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(mockUseCases.mining.getNetworkHashPS.calledOnce)
      assert.deepEqual(mockUseCases.mining.getNetworkHashPS.firstCall.args[0], {
        nblocks: 240,
        height: 1000
      })
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('RPC error')
      error.status = 500
      mockUseCases.mining.getNetworkHashPS.rejects(error)
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getNetworkHashPS(req, res)

      assert.equal(res.statusValue, 500)
      assert.deepEqual(res.jsonData, { error: 'RPC error' })
    })
  })
})
