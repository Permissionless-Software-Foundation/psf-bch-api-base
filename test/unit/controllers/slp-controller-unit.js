/*
  Unit tests for SlpRESTController.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import SlpRESTController from '../../../src/controllers/rest-api/slp/controller.js'
import {
  createMockRequest,
  createMockResponse
} from '../mocks/controller-mocks.js'

// Valid mainnet cash address for testing
const VALID_MAINNET_ADDRESS = 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'

describe('#slp-controller.js', () => {
  let sandbox
  let mockUseCases
  let mockAdapters
  let uut

  const createSlpUseCaseStubs = () => ({
    getStatus: sandbox.stub().resolves({ status: 'ok' }),
    getAddress: sandbox.stub().resolves({ balance: 1000 }),
    getTxid: sandbox.stub().resolves({ txid: 'abc' }),
    getTokenStats: sandbox.stub().resolves({ tokenData: {} }),
    getTokenData: sandbox.stub().resolves({ genesisData: {}, immutableData: '', mutableData: '' }),
    getTokenData2: sandbox.stub().resolves({ tokenIcon: 'test-icon.png' })
  })

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {}
    mockUseCases = {
      slp: createSlpUseCaseStubs()
    }

    uut = new SlpRESTController({
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
        new SlpRESTController({ useCases: mockUseCases })
      }, /Adapters library required/)
    })

    it('should require slp use cases', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new SlpRESTController({ adapters: mockAdapters, useCases: {} })
      }, /SLP use cases required/)
    })
  })

  describe('#root()', () => {
    it('should return service status', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.root(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { status: 'psf-slp-indexer' })
    })
  })

  describe('#getStatus()', () => {
    it('should return status on success', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getStatus(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { status: 'ok' })
      assert.isTrue(mockUseCases.slp.getStatus.calledOnce)
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('failure')
      error.status = 503
      mockUseCases.slp.getStatus.rejects(error)
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getStatus(req, res)

      assert.equal(res.statusValue, 503)
      assert.deepEqual(res.jsonData, { error: 'failure' })
    })
  })

  describe('#getAddress()', () => {
    it('should return address balance on success', async () => {
      const req = createMockRequest({
        body: { address: VALID_MAINNET_ADDRESS }
      })
      const res = createMockResponse()

      await uut.getAddress(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { balance: 1000 })
      assert.isTrue(mockUseCases.slp.getAddress.calledOnce)
    })

    it('should return error if address is empty', async () => {
      const req = createMockRequest({
        body: { address: '' }
      })
      const res = createMockResponse()

      await uut.getAddress(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'can not be empty')
    })

    it('should return error if address is missing', async () => {
      const req = createMockRequest({
        body: {}
      })
      const res = createMockResponse()

      await uut.getAddress(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('Invalid address')
      error.status = 400
      mockUseCases.slp.getAddress.rejects(error)
      const req = createMockRequest({
        body: { address: VALID_MAINNET_ADDRESS }
      })
      const res = createMockResponse()

      await uut.getAddress(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'Invalid address' })
    })
  })

  describe('#getTxid()', () => {
    it('should return transaction data on success', async () => {
      const req = createMockRequest({
        body: { txid: 'a'.repeat(64) }
      })
      const res = createMockResponse()

      await uut.getTxid(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { txid: 'abc' })
      assert.isTrue(mockUseCases.slp.getTxid.calledOnce)
    })

    it('should return error if txid is empty', async () => {
      const req = createMockRequest({
        body: { txid: '' }
      })
      const res = createMockResponse()

      await uut.getTxid(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'can not be empty')
    })

    it('should return error if txid is not 64 characters', async () => {
      const req = createMockRequest({
        body: { txid: 'abc' }
      })
      const res = createMockResponse()

      await uut.getTxid(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'not a txid')
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('Transaction not found')
      error.status = 404
      mockUseCases.slp.getTxid.rejects(error)
      const req = createMockRequest({
        body: { txid: 'a'.repeat(64) }
      })
      const res = createMockResponse()

      await uut.getTxid(req, res)

      assert.equal(res.statusValue, 404)
      assert.deepEqual(res.jsonData, { error: 'Transaction not found' })
    })
  })

  describe('#getTokenStats()', () => {
    it('should return token stats on success', async () => {
      const req = createMockRequest({
        body: { tokenId: 'a'.repeat(64) }
      })
      const res = createMockResponse()

      await uut.getTokenStats(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { tokenData: {} })
      assert.isTrue(mockUseCases.slp.getTokenStats.calledOnce)
    })

    it('should pass withTxHistory flag', async () => {
      const req = createMockRequest({
        body: { tokenId: 'a'.repeat(64), withTxHistory: true }
      })
      const res = createMockResponse()

      await uut.getTokenStats(req, res)

      assert.isTrue(mockUseCases.slp.getTokenStats.calledWith({
        tokenId: 'a'.repeat(64),
        withTxHistory: true
      }))
    })

    it('should return error if tokenId is empty', async () => {
      const req = createMockRequest({
        body: { tokenId: '' }
      })
      const res = createMockResponse()

      await uut.getTokenStats(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('Token not found')
      error.status = 404
      mockUseCases.slp.getTokenStats.rejects(error)
      const req = createMockRequest({
        body: { tokenId: 'a'.repeat(64) }
      })
      const res = createMockResponse()

      await uut.getTokenStats(req, res)

      assert.equal(res.statusValue, 404)
      assert.deepEqual(res.jsonData, { error: 'Token not found' })
    })
  })

  describe('#getTokenData()', () => {
    it('should return token data on success', async () => {
      const req = createMockRequest({
        body: { tokenId: 'a'.repeat(64) }
      })
      const res = createMockResponse()

      await uut.getTokenData(req, res)

      assert.equal(res.statusValue, 200)
      assert.property(res.jsonData, 'genesisData')
      assert.property(res.jsonData, 'immutableData')
      assert.property(res.jsonData, 'mutableData')
      assert.isTrue(mockUseCases.slp.getTokenData.calledOnce)
    })

    it('should return error if tokenId is empty', async () => {
      const req = createMockRequest({
        body: { tokenId: '' }
      })
      const res = createMockResponse()

      await uut.getTokenData(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('Token data not found')
      error.status = 404
      mockUseCases.slp.getTokenData.rejects(error)
      const req = createMockRequest({
        body: { tokenId: 'a'.repeat(64) }
      })
      const res = createMockResponse()

      await uut.getTokenData(req, res)

      assert.equal(res.statusValue, 404)
      assert.deepEqual(res.jsonData, { error: 'Token data not found' })
    })
  })

  describe('#getTokenData2()', () => {
    it('should return expanded token data on success', async () => {
      const req = createMockRequest({
        body: { tokenId: 'a'.repeat(64) }
      })
      const res = createMockResponse()

      await uut.getTokenData2(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { tokenIcon: 'test-icon.png' })
      assert.isTrue(mockUseCases.slp.getTokenData2.calledOnce)
    })

    it('should pass updateCache flag', async () => {
      const req = createMockRequest({
        body: { tokenId: 'a'.repeat(64), updateCache: true }
      })
      const res = createMockResponse()

      await uut.getTokenData2(req, res)

      assert.isTrue(mockUseCases.slp.getTokenData2.calledWith({
        tokenId: 'a'.repeat(64),
        updateCache: true
      }))
    })

    it('should return error if tokenId is empty', async () => {
      const req = createMockRequest({
        body: { tokenId: '' }
      })
      const res = createMockResponse()

      await uut.getTokenData2(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('Token icon not found')
      error.status = 404
      mockUseCases.slp.getTokenData2.rejects(error)
      const req = createMockRequest({
        body: { tokenId: 'a'.repeat(64) }
      })
      const res = createMockResponse()

      await uut.getTokenData2(req, res)

      assert.equal(res.statusValue, 404)
      assert.deepEqual(res.jsonData, { error: 'Token icon not found' })
    })
  })
})
