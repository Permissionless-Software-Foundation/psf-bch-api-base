/*
  Unit tests for BlockchainUseCases.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import BlockchainUseCases from '../../../src/use-cases/full-node-blockchain-use-cases.js'

describe('#full-node-blockchain-use-cases.js', () => {
  let sandbox
  let mockAdapters
  let uut

  const createAdapters = () => {
    return {
      fullNode: {
        call: sandbox.stub()
      }
    }
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = createAdapters()
    uut = new BlockchainUseCases({ adapters: mockAdapters })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#constructor()', () => {
    it('should require adapters', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new BlockchainUseCases()
      }, /Adapters instance required/)
    })

    it('should require full node adapter', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new BlockchainUseCases({ adapters: {} })
      }, /Full node adapter required/)
    })
  })

  describe('#getBestBlockHash()', () => {
    it('should call full node adapter without parameters', async () => {
      mockAdapters.fullNode.call.resolves('hash')

      const result = await uut.getBestBlockHash()

      assert.equal(result, 'hash')
      assert.isTrue(mockAdapters.fullNode.call.calledOnceWithExactly('getbestblockhash'))
    })
  })

  describe('#getBlockHeaders()', () => {
    it('should call adapter for each hash and return aggregated result', async () => {
      const hashes = ['a'.repeat(64), 'b'.repeat(64)]
      mockAdapters.fullNode.call
        .onFirstCall().resolves('header-1')
        .onSecondCall().resolves('header-2')

      const result = await uut.getBlockHeaders({ hashes, verbose: true })

      assert.deepEqual(result, ['header-1', 'header-2'])
      assert.isTrue(
        mockAdapters.fullNode.call.calledWithExactly(
          'getblockheader',
          [hashes[0], true],
          `getblockheader-${hashes[0]}`
        )
      )
      assert.isTrue(
        mockAdapters.fullNode.call.calledWithExactly(
          'getblockheader',
          [hashes[1], true],
          `getblockheader-${hashes[1]}`
        )
      )
    })

    it('should rethrow errors from adapter', async () => {
      const hashes = ['a'.repeat(64)]
      mockAdapters.fullNode.call.rejects(new Error('failure'))

      try {
        await uut.getBlockHeaders({ hashes })
        assert.fail('Unexpected success')
      } catch (err) {
        assert.equal(err.message, 'failure')
      }
    })
  })

  describe('#getTxOut()', () => {
    it('should pass parameters to full node call', async () => {
      mockAdapters.fullNode.call.resolves({ value: 1 })

      const result = await uut.getTxOut({
        txid: 'txid',
        n: 0,
        includeMempool: true
      })

      assert.deepEqual(result, { value: 1 })
      assert.isTrue(
        mockAdapters.fullNode.call.calledOnceWithExactly(
          'gettxout',
          ['txid', 0, true]
        )
      )
    })
  })

  describe('#verifyTxOutProofs()', () => {
    it('should call adapter for each proof and return aggregated results', async () => {
      const proofs = ['proof-1', 'proof-2']
      mockAdapters.fullNode.call.onFirstCall().resolves(['txid-1'])
      mockAdapters.fullNode.call.onSecondCall().resolves(['txid-2'])

      const result = await uut.verifyTxOutProofs({ proofs })

      assert.deepEqual(result, [['txid-1'], ['txid-2']])
      assert.isTrue(
        mockAdapters.fullNode.call.calledWithExactly(
          'verifytxoutproof',
          ['proof-1'],
          `verifytxoutproof-${proofs[0].slice(0, 16)}`
        )
      )
    })
  })
})
