/*
  Unit tests for RESTControllers index.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import RESTControllers from '../../../src/controllers/rest-api/index.js'
import BlockchainRouter from '../../../src/controllers/rest-api/full-node/blockchain/index.js'

describe('#controllers/rest-api/index.js', () => {
  let sandbox
  let mockAdapters
  let mockUseCases

  const createBlockchainUseCaseStubs = () => ({
    getBestBlockHash: () => {},
    getBlockchainInfo: () => {},
    getBlockCount: () => {},
    getBlockHeader: () => {},
    getBlockHeaders: () => {},
    getChainTips: () => {},
    getDifficulty: () => {},
    getMempoolEntry: () => {},
    getMempoolEntries: () => {},
    getMempoolAncestors: () => {},
    getMempoolInfo: () => {},
    getRawMempool: () => {},
    getTxOut: () => {},
    getTxOutProof: () => {},
    getTxOutProofs: () => {},
    verifyTxOutProof: () => {},
    verifyTxOutProofs: () => {},
    getBlock: () => {},
    getBlockHash: () => {}
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
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#constructor()', () => {
    it('should require adapters instance', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new RESTControllers({ useCases: mockUseCases })
      }, /Adapters library required/)
    })

    it('should require useCases instance', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new RESTControllers({ adapters: mockAdapters })
      }, /Use Cases library required/)
    })
  })

  describe('#attachRESTControllers()', () => {
    it('should instantiate blockchain router and attach to app', () => {
      const attachStub = sandbox.stub(BlockchainRouter.prototype, 'attach')
      const restControllers = new RESTControllers({
        adapters: mockAdapters,
        useCases: mockUseCases
      })
      const app = {}

      restControllers.attachRESTControllers(app)

      assert.isTrue(attachStub.calledOnce)
      assert.equal(attachStub.getCall(0).args[0], app)
    })
  })
})
