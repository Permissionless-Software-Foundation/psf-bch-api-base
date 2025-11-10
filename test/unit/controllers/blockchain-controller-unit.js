/*
  Unit tests for BlockchainRESTController.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import BlockchainRESTController from '../../../src/controllers/rest-api/full-node/blockchain/controller.js'
import {
  createMockRequest,
  createMockResponse
} from '../mocks/controller-mocks.js'

describe('#blockchain-controller.js', () => {
  let sandbox
  let mockUseCases
  let mockAdapters
  let uut

  const createBlockchainUseCaseStubs = () => ({
    getBestBlockHash: sandbox.stub().resolves('hash'),
    getBlockchainInfo: sandbox.stub().resolves({}),
    getBlockCount: sandbox.stub().resolves(123),
    getBlockHeader: sandbox.stub().resolves({ header: true }),
    getBlockHeaders: sandbox.stub().resolves(['header']),
    getChainTips: sandbox.stub().resolves(['tip']),
    getDifficulty: sandbox.stub().resolves(1),
    getMempoolEntry: sandbox.stub().resolves({}),
    getMempoolEntries: sandbox.stub().resolves([]),
    getMempoolAncestors: sandbox.stub().resolves([]),
    getMempoolInfo: sandbox.stub().resolves({ size: 1 }),
    getRawMempool: sandbox.stub().resolves(['tx']),
    getTxOut: sandbox.stub().resolves({ value: 1 }),
    getTxOutProof: sandbox.stub().resolves('proof'),
    getTxOutProofs: sandbox.stub().resolves(['proof']),
    verifyTxOutProof: sandbox.stub().resolves(['txid']),
    verifyTxOutProofs: sandbox.stub().resolves([['txid']]),
    getBlock: sandbox.stub().resolves({ hash: 'abc' }),
    getBlockHash: sandbox.stub().resolves('blockhash')
  })

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {
      fullNode: {
        validateArraySize: sandbox.stub().returns(true)
      }
    }
    mockUseCases = {
      blockchain: createBlockchainUseCaseStubs()
    }
    uut = new BlockchainRESTController({
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
        new BlockchainRESTController({ useCases: mockUseCases })
      }, /Adapters library required/)
    })

    it('should require blockchain use cases', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new BlockchainRESTController({ adapters: mockAdapters, useCases: {} })
      }, /Blockchain use cases required/)
    })
  })

  describe('#root()', () => {
    it('should return service status', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.root(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { status: 'blockchain' })
    })
  })

  describe('#getBestBlockHash()', () => {
    it('should return hash on success', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getBestBlockHash(req, res)

      assert.equal(res.statusValue, 200)
      assert.equal(res.jsonData, 'hash')
      assert.isTrue(mockUseCases.blockchain.getBestBlockHash.calledOnce)
    })

    it('should handle errors via handleError()', async () => {
      const error = new Error('failure')
      error.status = 422
      mockUseCases.blockchain.getBestBlockHash.rejects(error)
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getBestBlockHash(req, res)

      assert.equal(res.statusValue, 422)
      assert.deepEqual(res.jsonData, { error: 'failure' })
    })
  })

  describe('#getBlockHeaderSingle()', () => {
    it('should return 400 if hash is missing', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getBlockHeaderSingle(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })

    it('should call use case with verbose flag', async () => {
      const hash = 'a'.repeat(64)
      const req = createMockRequest({
        params: { hash },
        query: { verbose: 'true' }
      })
      const res = createMockResponse()

      await uut.getBlockHeaderSingle(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(
        mockUseCases.blockchain.getBlockHeader.calledOnceWithExactly({
          hash,
          verbose: true
        })
      )
    })
  })

  describe('#getBlockHeaderBulk()', () => {
    it('should return error if hashes is not array', async () => {
      const req = createMockRequest({
        body: { hashes: 'not-an-array' },
        locals: {}
      })
      const res = createMockResponse()

      await uut.getBlockHeaderBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.include(res.jsonData.error, 'hashes needs to be an array')
    })

    it('should validate array size and call use case', async () => {
      const hash = 'a'.repeat(64)
      const req = createMockRequest({
        body: { hashes: [hash], verbose: true },
        locals: { proLimit: false }
      })
      const res = createMockResponse()
      mockUseCases.blockchain.getBlockHeaders.resolves(['result'])

      await uut.getBlockHeaderBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, ['result'])
      assert.isTrue(
        mockAdapters.fullNode.validateArraySize.calledOnceWithExactly(1, { isProUser: false })
      )
      assert.isTrue(
        mockUseCases.blockchain.getBlockHeaders.calledOnceWithExactly({
          hashes: [hash],
          verbose: true
        })
      )
    })

    it('should return error if array size invalid', async () => {
      mockAdapters.fullNode.validateArraySize.returns(false)
      const req = createMockRequest({
        body: { hashes: ['a'.repeat(64)] },
        locals: {}
      })
      const res = createMockResponse()

      await uut.getBlockHeaderBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.equal(res.jsonData.error, 'Array too large.')
    })
  })

  describe('#verifyTxOutProofBulk()', () => {
    it('should flatten proof responses', async () => {
      mockUseCases.blockchain.verifyTxOutProofs.resolves([['txid-a'], ['txid-b']])
      const req = createMockRequest({
        body: { proofs: ['proof-a', 'proof-b'] },
        locals: {}
      })
      const res = createMockResponse()

      await uut.verifyTxOutProofBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, ['txid-a', 'txid-b'])
    })
  })
})
