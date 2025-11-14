/*
  Unit tests for RawTransactionsUseCases.
*/

import { assert } from 'chai'

import RawTransactionsUseCases from '../../../src/use-cases/full-node-rawtransactions-use-cases.js'

describe('#full-node-rawtransactions-use-cases.js', () => {
  let mockAdapters
  let uut

  beforeEach(() => {
    mockAdapters = {
      fullNode: {
        call: async () => ({})
      }
    }

    uut = new RawTransactionsUseCases({ adapters: mockAdapters })
  })

  describe('#constructor()', () => {
    it('should require adapters', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new RawTransactionsUseCases()
      }, /Adapters instance required/)
    })

    it('should require full node adapter', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new RawTransactionsUseCases({ adapters: {} })
      }, /Full node adapter required/)
    })
  })

  describe('#decodeRawTransaction()', () => {
    it('should call full node adapter with correct method', async () => {
      let capturedMethod = ''
      let capturedParams = []
      mockAdapters.fullNode.call = async (method, params) => {
        capturedMethod = method
        capturedParams = params
        return { txid: 'abc123', version: 2 }
      }

      const result = await uut.decodeRawTransaction({ hex: '01000000' })

      assert.equal(capturedMethod, 'decoderawtransaction')
      assert.deepEqual(capturedParams, ['01000000'])
      assert.deepEqual(result, { txid: 'abc123', version: 2 })
    })
  })

  describe('#decodeRawTransactions()', () => {
    it('should call full node adapter for each hex in parallel', async () => {
      const callCount = { count: 0 }
      mockAdapters.fullNode.call = async (method, params) => {
        callCount.count++
        return { txid: `tx${callCount.count}`, hex: params[0] }
      }

      const hexes = ['hex1', 'hex2', 'hex3']
      const result = await uut.decodeRawTransactions({ hexes })

      assert.equal(callCount.count, 3)
      assert.equal(result.length, 3)
      assert.equal(result[0].txid, 'tx1')
      assert.equal(result[1].txid, 'tx2')
      assert.equal(result[2].txid, 'tx3')
    })
  })

  describe('#decodeScript()', () => {
    it('should call full node adapter with correct method', async () => {
      let capturedMethod = ''
      let capturedParams = []
      mockAdapters.fullNode.call = async (method, params) => {
        capturedMethod = method
        capturedParams = params
        return { asm: 'OP_DUP OP_HASH160', type: 'pubkeyhash' }
      }

      const result = await uut.decodeScript({ hex: '76a914' })

      assert.equal(capturedMethod, 'decodescript')
      assert.deepEqual(capturedParams, ['76a914'])
      assert.deepEqual(result, { asm: 'OP_DUP OP_HASH160', type: 'pubkeyhash' })
    })
  })

  describe('#decodeScripts()', () => {
    it('should call full node adapter for each hex in parallel', async () => {
      const callCount = { count: 0 }
      mockAdapters.fullNode.call = async (method, params) => {
        callCount.count++
        return { asm: `script${callCount.count}`, hex: params[0] }
      }

      const hexes = ['script1', 'script2']
      const result = await uut.decodeScripts({ hexes })

      assert.equal(callCount.count, 2)
      assert.equal(result.length, 2)
    })
  })

  describe('#getRawTransaction()', () => {
    it('should call full node adapter with verbose=false by default', async () => {
      let capturedParams = []
      mockAdapters.fullNode.call = async (method, params) => {
        capturedParams = params
        return '01000000'
      }

      await uut.getRawTransaction({ txid: 'abc123' })

      assert.deepEqual(capturedParams, ['abc123', 0])
    })

    it('should call full node adapter with verbose=true when specified', async () => {
      let capturedParams = []
      mockAdapters.fullNode.call = async (method, params) => {
        capturedParams = params
        return { txid: 'abc123', version: 2 }
      }

      await uut.getRawTransaction({ txid: 'abc123', verbose: true })

      assert.deepEqual(capturedParams, ['abc123', 1])
    })
  })

  describe('#getRawTransactions()', () => {
    it('should call full node adapter for each txid in parallel', async () => {
      const callCount = { count: 0 }
      mockAdapters.fullNode.call = async (method, params) => {
        callCount.count++
        return { txid: params[0], version: 2 }
      }

      const txids = ['tx1', 'tx2']
      const result = await uut.getRawTransactions({ txids, verbose: true })

      assert.equal(callCount.count, 2)
      assert.equal(result.length, 2)
    })
  })

  describe('#getRawTransactionWithHeight()', () => {
    it('should return transaction without height when verbose=false', async () => {
      mockAdapters.fullNode.call = async (method, params) => {
        if (method === 'getrawtransaction') {
          return '01000000'
        }
        return {}
      }

      const result = await uut.getRawTransactionWithHeight({ txid: 'abc123', verbose: false })

      assert.equal(result, '01000000')
    })

    it('should fetch and append height when verbose=true and blockhash exists', async () => {
      let callCount = 0
      mockAdapters.fullNode.call = async (method, params) => {
        callCount++
        if (method === 'getrawtransaction') {
          return { txid: 'abc123', blockhash: 'block123' }
        }
        if (method === 'getblockheader') {
          return { height: 100, hash: 'block123' }
        }
        return {}
      }

      const result = await uut.getRawTransactionWithHeight({ txid: 'abc123', verbose: true })

      assert.equal(callCount, 2)
      assert.equal(result.height, 100)
      assert.equal(result.txid, 'abc123')
    })

    it('should handle block header lookup failure gracefully', async () => {
      let callCount = 0
      mockAdapters.fullNode.call = async (method, params) => {
        callCount++
        if (method === 'getrawtransaction') {
          return { txid: 'abc123', blockhash: 'block123' }
        }
        if (method === 'getblockheader') {
          throw new Error('Block not found')
        }
        return {}
      }

      const result = await uut.getRawTransactionWithHeight({ txid: 'abc123', verbose: true })

      assert.equal(callCount, 2)
      assert.isNull(result.height)
      assert.equal(result.txid, 'abc123')
    })
  })

  describe('#getBlockHeader()', () => {
    it('should call full node adapter with correct method', async () => {
      let capturedMethod = ''
      let capturedParams = []
      mockAdapters.fullNode.call = async (method, params) => {
        capturedMethod = method
        capturedParams = params
        return { height: 100, hash: 'block123' }
      }

      const result = await uut.getBlockHeader({ blockHash: 'block123', verbose: true })

      assert.equal(capturedMethod, 'getblockheader')
      assert.deepEqual(capturedParams, ['block123', true])
      assert.deepEqual(result, { height: 100, hash: 'block123' })
    })
  })

  describe('#sendRawTransaction()', () => {
    it('should call full node adapter with correct method', async () => {
      let capturedMethod = ''
      let capturedParams = []
      mockAdapters.fullNode.call = async (method, params) => {
        capturedMethod = method
        capturedParams = params
        return 'txid123'
      }

      const result = await uut.sendRawTransaction({ hex: '01000000' })

      assert.equal(capturedMethod, 'sendrawtransaction')
      assert.deepEqual(capturedParams, ['01000000'])
      assert.equal(result, 'txid123')
    })
  })

  describe('#sendRawTransactions()', () => {
    it('should send transactions serially, not in parallel', async () => {
      const callOrder = []
      mockAdapters.fullNode.call = async (method, params) => {
        callOrder.push(params[0])
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 10))
        return `txid-${params[0]}`
      }

      const hexes = ['hex1', 'hex2', 'hex3']
      const startTime = Date.now()
      const result = await uut.sendRawTransactions({ hexes })
      const endTime = Date.now()

      // Should take at least 30ms if serial (3 * 10ms)
      assert.isAtLeast(endTime - startTime, 25)
      assert.deepEqual(callOrder, ['hex1', 'hex2', 'hex3'])
      assert.equal(result.length, 3)
      assert.equal(result[0], 'txid-hex1')
      assert.equal(result[1], 'txid-hex2')
      assert.equal(result[2], 'txid-hex3')
    })
  })
})
