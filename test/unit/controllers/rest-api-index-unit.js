/*
  Unit tests for RESTControllers index.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import RESTControllers from '../../../src/controllers/rest-api/index.js'
import BlockchainRouter from '../../../src/controllers/rest-api/full-node/blockchain/router.js'
import ControlRouter from '../../../src/controllers/rest-api/full-node/control/router.js'
import DSProofRouter from '../../../src/controllers/rest-api/full-node/dsproof/router.js'
import MiningRouter from '../../../src/controllers/rest-api/full-node/mining/router.js'
import RawTransactionsRouter from '../../../src/controllers/rest-api/full-node/rawtransactions/router.js'

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
      blockchain: createBlockchainUseCaseStubs(),
      control: {
        getNetworkInfo: () => {}
      },
      dsproof: {
        getDSProof: () => {}
      },
      mining: {
        getMiningInfo: () => {},
        getNetworkHashPS: () => {}
      },
      rawtransactions: {
        decodeRawTransaction: () => {},
        decodeRawTransactions: () => {},
        decodeScript: () => {},
        decodeScripts: () => {},
        getRawTransaction: () => {},
        getRawTransactionWithHeight: () => {},
        getRawTransactions: () => {},
        sendRawTransaction: () => {},
        sendRawTransactions: () => {}
      }
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
    it('should instantiate routers and attach to app', () => {
      const blockchainAttachStub = sandbox.stub(BlockchainRouter.prototype, 'attach')
      const controlAttachStub = sandbox.stub(ControlRouter.prototype, 'attach')
      const dsproofAttachStub = sandbox.stub(DSProofRouter.prototype, 'attach')
      const miningAttachStub = sandbox.stub(MiningRouter.prototype, 'attach')
      const rawtransactionsAttachStub = sandbox.stub(RawTransactionsRouter.prototype, 'attach')
      const restControllers = new RESTControllers({
        adapters: mockAdapters,
        useCases: mockUseCases
      })
      const app = {}

      restControllers.attachRESTControllers(app)

      assert.isTrue(blockchainAttachStub.calledOnce)
      assert.equal(blockchainAttachStub.getCall(0).args[0], app)
      assert.isTrue(controlAttachStub.calledOnce)
      assert.equal(controlAttachStub.getCall(0).args[0], app)
      assert.isTrue(dsproofAttachStub.calledOnce)
      assert.equal(dsproofAttachStub.getCall(0).args[0], app)
      assert.isTrue(miningAttachStub.calledOnce)
      assert.equal(miningAttachStub.getCall(0).args[0], app)
      assert.isTrue(rawtransactionsAttachStub.calledOnce)
      assert.equal(rawtransactionsAttachStub.getCall(0).args[0], app)
    })
  })
})
