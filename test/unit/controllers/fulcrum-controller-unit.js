/*
  Unit tests for FulcrumRESTController.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import FulcrumRESTController from '../../../src/controllers/rest-api/full-node/fulcrum/controller.js'
import {
  createMockRequest,
  createMockResponse
} from '../mocks/controller-mocks.js'

// Valid mainnet cash address for testing
const VALID_MAINNET_ADDRESS = 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'

describe('#fulcrum-controller.js', () => {
  let sandbox
  let mockUseCases
  let mockAdapters
  let uut

  const createFulcrumUseCaseStubs = () => ({
    getBalance: sandbox.stub().resolves({ balance: 1000 }),
    getBalances: sandbox.stub().resolves({ balances: [] }),
    getUtxos: sandbox.stub().resolves({ utxos: [] }),
    getUtxosBulk: sandbox.stub().resolves({ utxos: [] }),
    getTransactionDetails: sandbox.stub().resolves({ txid: 'abc' }),
    getTransactionDetailsBulk: sandbox.stub().resolves({ transactions: [] }),
    broadcastTransaction: sandbox.stub().resolves({ txid: 'abc' }),
    getBlockHeaders: sandbox.stub().resolves({ headers: [] }),
    getBlockHeadersBulk: sandbox.stub().resolves({ headers: [] }),
    getTransactions: sandbox.stub().resolves({ transactions: [] }),
    getTransactionsBulk: sandbox.stub().resolves({ transactions: [] }),
    getMempool: sandbox.stub().resolves({ mempool: [] }),
    getMempoolBulk: sandbox.stub().resolves({ mempool: [] })
  })

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {
      fullNode: {
        validateArraySize: sandbox.stub().returns(true)
      }
    }
    mockUseCases = {
      fulcrum: createFulcrumUseCaseStubs()
    }

    uut = new FulcrumRESTController({
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
        new FulcrumRESTController({ useCases: mockUseCases })
      }, /Adapters library required/)
    })

    it('should require fulcrum use cases', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new FulcrumRESTController({ adapters: mockAdapters, useCases: {} })
      }, /Fulcrum use cases required/)
    })
  })

  describe('#root()', () => {
    it('should return service status', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.root(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { status: 'fulcrum' })
    })
  })

  describe('#getBalance()', () => {
    it('should return balance on success', async () => {
      const req = createMockRequest({
        params: { address: VALID_MAINNET_ADDRESS }
      })
      const res = createMockResponse()

      await uut.getBalance(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { balance: 1000 })
      assert.isTrue(mockUseCases.fulcrum.getBalance.calledOnce)
    })

    it('should return error if address is array', async () => {
      const req = createMockRequest({
        params: { address: [] }
      })
      const res = createMockResponse()

      await uut.getBalance(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('failure')
      error.status = 503
      mockUseCases.fulcrum.getBalance.rejects(error)
      const req = createMockRequest({
        params: { address: VALID_MAINNET_ADDRESS }
      })
      const res = createMockResponse()

      await uut.getBalance(req, res)

      assert.equal(res.statusValue, 503)
      assert.deepEqual(res.jsonData, { error: 'failure' })
    })
  })

  describe('#balanceBulk()', () => {
    it('should return error if addresses is not array', async () => {
      const req = createMockRequest({
        body: { addresses: 'not-an-array' }
      })
      const res = createMockResponse()

      await uut.balanceBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })

    it('should validate array size and call use case', async () => {
      const req = createMockRequest({
        body: { addresses: [VALID_MAINNET_ADDRESS] }
      })
      const res = createMockResponse()

      await uut.balanceBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(mockAdapters.fullNode.validateArraySize.calledOnce)
      assert.isTrue(mockUseCases.fulcrum.getBalances.calledOnce)
    })

    it('should return error if array size invalid', async () => {
      mockAdapters.fullNode.validateArraySize.returns(false)
      const req = createMockRequest({
        body: { addresses: [VALID_MAINNET_ADDRESS] }
      })
      const res = createMockResponse()

      await uut.balanceBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.equal(res.jsonData.error, 'Array too large.')
    })
  })

  describe('#getUtxos()', () => {
    it('should return utxos on success', async () => {
      const req = createMockRequest({
        params: { address: VALID_MAINNET_ADDRESS }
      })
      const res = createMockResponse()

      await uut.getUtxos(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { utxos: [] })
      assert.isTrue(mockUseCases.fulcrum.getUtxos.calledOnce)
    })
  })

  describe('#utxosBulk()', () => {
    it('should validate array and call use case', async () => {
      const req = createMockRequest({
        body: { addresses: [VALID_MAINNET_ADDRESS] }
      })
      const res = createMockResponse()

      await uut.utxosBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(mockUseCases.fulcrum.getUtxosBulk.calledOnce)
    })
  })

  describe('#getTransactionDetails()', () => {
    it('should return transaction details on success', async () => {
      const txid = 'a'.repeat(64)
      const req = createMockRequest({
        params: { txid }
      })
      const res = createMockResponse()

      await uut.getTransactionDetails(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { txid: 'abc' })
      assert.isTrue(mockUseCases.fulcrum.getTransactionDetails.calledOnce)
    })

    it('should return error if txid is not string', async () => {
      const req = createMockRequest({
        params: { txid: 123 }
      })
      const res = createMockResponse()

      await uut.getTransactionDetails(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })
  })

  describe('#transactionDetailsBulk()', () => {
    it('should validate array and call use case', async () => {
      const req = createMockRequest({
        body: { txids: ['a'.repeat(64)], verbose: true }
      })
      const res = createMockResponse()

      await uut.transactionDetailsBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(mockUseCases.fulcrum.getTransactionDetailsBulk.calledOnce)
    })

    it('should default verbose to true', async () => {
      const req = createMockRequest({
        body: { txids: ['a'.repeat(64)] }
      })
      const res = createMockResponse()

      await uut.transactionDetailsBulk(req, res)

      assert.isTrue(
        mockUseCases.fulcrum.getTransactionDetailsBulk.calledWithMatch({
          txids: ['a'.repeat(64)],
          verbose: true
        })
      )
    })
  })

  describe('#broadcastTransaction()', () => {
    it('should broadcast transaction on success', async () => {
      const req = createMockRequest({
        body: { txHex: '010203' }
      })
      const res = createMockResponse()

      await uut.broadcastTransaction(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { txid: 'abc' })
      assert.isTrue(mockUseCases.fulcrum.broadcastTransaction.calledOnce)
    })

    it('should return error if txHex is not string', async () => {
      const req = createMockRequest({
        body: { txHex: 123 }
      })
      const res = createMockResponse()

      await uut.broadcastTransaction(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })
  })

  describe('#getBlockHeaders()', () => {
    it('should return block headers on success', async () => {
      const req = createMockRequest({
        params: { height: '100' },
        query: { count: '2' }
      })
      const res = createMockResponse()

      await uut.getBlockHeaders(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(
        mockUseCases.fulcrum.getBlockHeaders.calledWithMatch({
          height: 100,
          count: 2
        })
      )
    })

    it('should default count to 1', async () => {
      const req = createMockRequest({
        params: { height: '100' }
      })
      const res = createMockResponse()

      await uut.getBlockHeaders(req, res)

      assert.isTrue(
        mockUseCases.fulcrum.getBlockHeaders.calledWithMatch({
          height: 100,
          count: 1
        })
      )
    })

    it('should return error if height is invalid', async () => {
      const req = createMockRequest({
        params: { height: 'invalid' }
      })
      const res = createMockResponse()

      await uut.getBlockHeaders(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })
  })

  describe('#blockHeadersBulk()', () => {
    it('should validate heights array and call use case', async () => {
      const req = createMockRequest({
        body: { heights: [{ height: 100, count: 2 }] }
      })
      const res = createMockResponse()

      await uut.blockHeadersBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(mockUseCases.fulcrum.getBlockHeadersBulk.calledOnce)
    })

    it('should return error if heights is not array', async () => {
      const req = createMockRequest({
        body: { heights: 'not-an-array' }
      })
      const res = createMockResponse()

      await uut.blockHeadersBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })

    it('should validate height objects', async () => {
      const req = createMockRequest({
        body: { heights: [{ height: 'invalid', count: 2 }] }
      })
      const res = createMockResponse()

      await uut.blockHeadersBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
    })
  })

  describe('#getTransactions()', () => {
    it('should return transactions on success', async () => {
      const req = createMockRequest({
        params: { address: VALID_MAINNET_ADDRESS }
      })
      const res = createMockResponse()

      await uut.getTransactions(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(mockUseCases.fulcrum.getTransactions.calledOnce)
    })

    it('should handle allTxs from params', async () => {
      const req = createMockRequest({
        params: { address: VALID_MAINNET_ADDRESS, allTxs: 'true' }
      })
      const res = createMockResponse()

      await uut.getTransactions(req, res)

      assert.isTrue(
        mockUseCases.fulcrum.getTransactions.calledWithMatch({
          address: VALID_MAINNET_ADDRESS,
          allTxs: true
        })
      )
    })

    it('should handle allTxs from query', async () => {
      const req = createMockRequest({
        params: { address: VALID_MAINNET_ADDRESS },
        query: { allTxs: 'true' }
      })
      const res = createMockResponse()

      await uut.getTransactions(req, res)

      assert.isTrue(
        mockUseCases.fulcrum.getTransactions.calledWithMatch({
          allTxs: true
        })
      )
    })
  })

  describe('#transactionsBulk()', () => {
    it('should validate addresses and call use case', async () => {
      const req = createMockRequest({
        body: { addresses: [VALID_MAINNET_ADDRESS], allTxs: true }
      })
      const res = createMockResponse()

      await uut.transactionsBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(mockUseCases.fulcrum.getTransactionsBulk.calledOnce)
    })
  })

  describe('#getMempool()', () => {
    it('should return mempool on success', async () => {
      const req = createMockRequest({
        params: { address: VALID_MAINNET_ADDRESS }
      })
      const res = createMockResponse()

      await uut.getMempool(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { mempool: [] })
      assert.isTrue(mockUseCases.fulcrum.getMempool.calledOnce)
    })
  })

  describe('#mempoolBulk()', () => {
    it('should validate addresses and call use case', async () => {
      const req = createMockRequest({
        body: { addresses: [VALID_MAINNET_ADDRESS] }
      })
      const res = createMockResponse()

      await uut.mempoolBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(mockUseCases.fulcrum.getMempoolBulk.calledOnce)
    })
  })

  describe('#handleError()', () => {
    it('should handle errors with status', async () => {
      const error = new Error('test error')
      error.status = 400
      const res = createMockResponse()

      uut.handleError(error, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'test error' })
    })

    it('should default status to 500', async () => {
      const error = new Error('test error')
      const res = createMockResponse()

      uut.handleError(error, res)

      assert.equal(res.statusValue, 500)
      assert.deepEqual(res.jsonData, { error: 'test error' })
    })
  })
})
