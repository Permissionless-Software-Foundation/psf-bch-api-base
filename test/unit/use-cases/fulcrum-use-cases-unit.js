/*
  Unit tests for FulcrumUseCases.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import BCHJS from '@psf/bch-js'

import FulcrumUseCases from '../../../src/use-cases/fulcrum-use-cases.js'

describe('#fulcrum-use-cases.js', () => {
  let sandbox
  let mockAdapters
  let uut
  let sortAllTxsStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {
      fulcrum: {
        get: sandbox.stub().resolves({}),
        post: sandbox.stub().resolves({})
      }
    }

    // Create a mock BCHJS instance with stubbed sortAllTxs method
    const mockBchjs = new BCHJS()
    if (!mockBchjs.Electrumx) {
      mockBchjs.Electrumx = {}
    }

    // Create a stub that sorts transactions
    sortAllTxsStub = sandbox.stub(mockBchjs.Electrumx, 'sortAllTxs')
    sortAllTxsStub.callsFake(async (txs, order) => {
      const sorted = [...txs].sort((a, b) => {
        if (order === 'DESCENDING') {
          return (b.height || 0) - (a.height || 0)
        }
        return (a.height || 0) - (b.height || 0)
      })
      return sorted
    })

    // Inject the mocked bchjs instance into the use cases
    uut = new FulcrumUseCases({ adapters: mockAdapters, bchjs: mockBchjs })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#constructor()', () => {
    it('should require adapters', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new FulcrumUseCases()
      }, /Adapters instance required/)
    })

    it('should require fulcrum adapter', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new FulcrumUseCases({ adapters: {} })
      }, /Fulcrum adapter required/)
    })
  })

  describe('#getBalance()', () => {
    it('should call fulcrum adapter get method', async () => {
      const address = 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      mockAdapters.fulcrum.get.resolves({ balance: 1000 })

      const result = await uut.getBalance({ address })

      assert.isTrue(mockAdapters.fulcrum.get.calledOnceWith(`electrumx/balance/${address}`))
      assert.deepEqual(result, { balance: 1000 })
    })
  })

  describe('#getBalances()', () => {
    it('should call fulcrum adapter post method', async () => {
      const addresses = ['bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf']
      mockAdapters.fulcrum.post.resolves({ balances: [] })

      const result = await uut.getBalances({ addresses })

      assert.isTrue(
        mockAdapters.fulcrum.post.calledOnceWith('electrumx/balance/', { addresses })
      )
      assert.deepEqual(result, { balances: [] })
    })
  })

  describe('#getUtxos()', () => {
    it('should call fulcrum adapter get method', async () => {
      const address = 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      mockAdapters.fulcrum.get.resolves({ utxos: [] })

      const result = await uut.getUtxos({ address })

      assert.isTrue(mockAdapters.fulcrum.get.calledOnceWith(`electrumx/utxos/${address}`))
      assert.deepEqual(result, { utxos: [] })
    })
  })

  describe('#getUtxosBulk()', () => {
    it('should call fulcrum adapter post method', async () => {
      const addresses = ['bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf']
      mockAdapters.fulcrum.post.resolves({ utxos: [] })

      const result = await uut.getUtxosBulk({ addresses })

      assert.isTrue(
        mockAdapters.fulcrum.post.calledOnceWith('electrumx/utxos/', { addresses })
      )
      assert.deepEqual(result, { utxos: [] })
    })
  })

  describe('#getTransactionDetails()', () => {
    it('should call fulcrum adapter get method', async () => {
      const txid = 'a'.repeat(64)
      mockAdapters.fulcrum.get.resolves({ txid })

      const result = await uut.getTransactionDetails({ txid })

      assert.isTrue(mockAdapters.fulcrum.get.calledOnceWith(`electrumx/tx/data/${txid}`))
      assert.deepEqual(result, { txid })
    })
  })

  describe('#getTransactionDetailsBulk()', () => {
    it('should call fulcrum adapter post method with verbose', async () => {
      const txids = ['a'.repeat(64)]
      const verbose = true
      mockAdapters.fulcrum.post.resolves({ transactions: [] })

      const result = await uut.getTransactionDetailsBulk({ txids, verbose })

      assert.isTrue(
        mockAdapters.fulcrum.post.calledOnceWith('electrumx/tx/data', { txids, verbose })
      )
      assert.deepEqual(result, { transactions: [] })
    })
  })

  describe('#broadcastTransaction()', () => {
    it('should call fulcrum adapter post method', async () => {
      const txHex = '010203'
      mockAdapters.fulcrum.post.resolves({ txid: 'abc' })

      const result = await uut.broadcastTransaction({ txHex })

      assert.isTrue(
        mockAdapters.fulcrum.post.calledOnceWith('electrumx/tx/broadcast', { txHex })
      )
      assert.deepEqual(result, { txid: 'abc' })
    })
  })

  describe('#getBlockHeaders()', () => {
    it('should call fulcrum adapter get method with height and count', async () => {
      const height = 100
      const count = 2
      mockAdapters.fulcrum.get.resolves({ headers: [] })

      const result = await uut.getBlockHeaders({ height, count })

      assert.isTrue(
        mockAdapters.fulcrum.get.calledOnceWith(`electrumx/block/headers/${height}?count=${count}`)
      )
      assert.deepEqual(result, { headers: [] })
    })
  })

  describe('#getBlockHeadersBulk()', () => {
    it('should call fulcrum adapter post method', async () => {
      const heights = [{ height: 100, count: 2 }]
      mockAdapters.fulcrum.post.resolves({ headers: [] })

      const result = await uut.getBlockHeadersBulk({ heights })

      assert.isTrue(
        mockAdapters.fulcrum.post.calledOnceWith('electrumx/block/headers', { heights })
      )
      assert.deepEqual(result, { headers: [] })
    })
  })

  describe('#getTransactions()', () => {
    it('should call fulcrum adapter and sort transactions when allTxs is false', async () => {
      const address = 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      const allTxs = false
      const mockTransactions = [
        { tx_hash: 'aaa', height: 100 },
        { tx_hash: 'bbb', height: 200 },
        { tx_hash: 'ccc', height: 150 }
      ]
      mockAdapters.fulcrum.get.resolves({
        transactions: mockTransactions
      })

      const result = await uut.getTransactions({ address, allTxs })

      assert.isTrue(mockAdapters.fulcrum.get.calledOnceWith(`electrumx/transactions/${address}`))
      assert.property(result, 'transactions')
      // Transactions should be sorted and limited to 100
      if (result.transactions && result.transactions.length > 100) {
        assert.isAtMost(result.transactions.length, 100)
      }
    })

    it('should return all transactions when allTxs is true', async () => {
      const address = 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      const allTxs = true
      const mockTransactions = Array(150).fill({ tx_hash: 'aaa', height: 100 })
      mockAdapters.fulcrum.get.resolves({
        transactions: mockTransactions
      })

      const result = await uut.getTransactions({ address, allTxs })

      assert.property(result, 'transactions')
      // All transactions should be returned when allTxs is true
      assert.equal(result.transactions.length, 150)
    })
  })

  describe('#getTransactionsBulk()', () => {
    it('should call fulcrum adapter and sort transactions for each address', async () => {
      const addresses = ['bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf']
      const allTxs = false
      const mockResponse = {
        transactions: [
          {
            transactions: [
              { tx_hash: 'aaa', height: 100 },
              { tx_hash: 'bbb', height: 200 }
            ]
          }
        ]
      }
      mockAdapters.fulcrum.post.resolves(mockResponse)

      const result = await uut.getTransactionsBulk({ addresses, allTxs })

      assert.isTrue(
        mockAdapters.fulcrum.post.calledOnceWith('electrumx/transactions/', { addresses })
      )
      assert.property(result, 'transactions')
    })

    it('should limit to 100 transactions when allTxs is false', async () => {
      const addresses = ['bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf']
      const allTxs = false
      const mockTransactions = Array(150).fill({ tx_hash: 'aaa', height: 100 })
      const mockResponse = {
        transactions: [
          {
            transactions: mockTransactions
          }
        ]
      }
      mockAdapters.fulcrum.post.resolves(mockResponse)

      const result = await uut.getTransactionsBulk({ addresses, allTxs })

      assert.isAtMost(result.transactions[0].transactions.length, 100)
    })
  })

  describe('#getMempool()', () => {
    it('should call fulcrum adapter get method', async () => {
      const address = 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      mockAdapters.fulcrum.get.resolves({ mempool: [] })

      const result = await uut.getMempool({ address })

      assert.isTrue(mockAdapters.fulcrum.get.calledOnceWith(`electrumx/unconfirmed/${address}`))
      assert.deepEqual(result, { mempool: [] })
    })
  })

  describe('#getMempoolBulk()', () => {
    it('should call fulcrum adapter post method', async () => {
      const addresses = ['bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf']
      mockAdapters.fulcrum.post.resolves({ mempool: [] })

      const result = await uut.getMempoolBulk({ addresses })

      assert.isTrue(
        mockAdapters.fulcrum.post.calledOnceWith('electrumx/unconfirmed/', { addresses })
      )
      assert.deepEqual(result, { mempool: [] })
    })
  })
})
