/*
  Unit tests for EncryptionUseCases.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import EncryptionUseCases from '../../../src/use-cases/encryption-use-cases.js'

describe('#encryption-use-cases.js', () => {
  let sandbox
  let mockAdapters
  let mockUseCases
  let mockBchjs
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {}

    // Mock bchjs
    mockBchjs = {
      Address: {
        toCashAddress: sandbox.stub().returns('bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf')
      },
      ECPair: {
        fromPublicKey: sandbox.stub().returns({}),
        toCashAddress: sandbox.stub().returns('bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf')
      }
    }

    // Mock use cases
    mockUseCases = {
      fulcrum: {
        getTransactions: sandbox.stub().resolves({
          transactions: [
            { tx_hash: 'abc123def456' }
          ]
        })
      },
      rawtransactions: {
        getRawTransaction: sandbox.stub().resolves({
          vin: [
            {
              scriptSig: {
                asm: 'signature 02abc123def456789'
              }
            }
          ]
        })
      }
    }

    uut = new EncryptionUseCases({
      adapters: mockAdapters,
      useCases: mockUseCases,
      bchjs: mockBchjs
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#constructor()', () => {
    it('should require adapters', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new EncryptionUseCases({ useCases: mockUseCases })
      }, /Adapters instance required/)
    })

    it('should require useCases', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new EncryptionUseCases({ adapters: mockAdapters })
      }, /UseCases instance required/)
    })
  })

  describe('#getPublicKey()', () => {
    it('should return public key when found', async () => {
      const result = await uut.getPublicKey({ address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf' })

      assert.isTrue(result.success)
      assert.equal(result.publicKey, '02abc123def456789')
      assert.isTrue(mockBchjs.Address.toCashAddress.calledOnce)
      assert.isTrue(mockUseCases.fulcrum.getTransactions.calledOnce)
      assert.isTrue(mockUseCases.rawtransactions.getRawTransaction.calledOnce)
    })

    it('should return not found when public key does not match', async () => {
      // Make the ECPair.toCashAddress return a different address
      mockBchjs.ECPair.toCashAddress.returns('bitcoincash:qqq000000000000000000000000000000000000000')

      const result = await uut.getPublicKey({ address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf' })

      assert.isFalse(result.success)
      assert.equal(result.publicKey, 'not found')
    })

    it('should throw error when no transaction history', async () => {
      mockUseCases.fulcrum.getTransactions.resolves({
        transactions: []
      })

      try {
        await uut.getPublicKey({ address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf' })
        assert.fail('Should have thrown an error')
      } catch (err) {
        assert.equal(err.message, 'No transaction history.')
      }
    })

    it('should handle transactions without scriptSig', async () => {
      mockUseCases.rawtransactions.getRawTransaction.resolves({
        vin: [
          { txid: 'coinbase' } // No scriptSig
        ]
      })

      const result = await uut.getPublicKey({ address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf' })

      assert.isFalse(result.success)
      assert.equal(result.publicKey, 'not found')
    })

    it('should handle invalid public key hex gracefully', async () => {
      mockUseCases.rawtransactions.getRawTransaction.resolves({
        vin: [
          {
            scriptSig: {
              asm: 'signature NOT_VALID_HEX'
            }
          }
        ]
      })

      const result = await uut.getPublicKey({ address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf' })

      assert.isFalse(result.success)
      assert.equal(result.publicKey, 'not found')
    })

    it('should handle ECPair.fromPublicKey throwing error', async () => {
      mockBchjs.ECPair.fromPublicKey.throws(new Error('Invalid public key'))

      const result = await uut.getPublicKey({ address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf' })

      assert.isFalse(result.success)
      assert.equal(result.publicKey, 'not found')
    })

    it('should search through multiple transactions', async () => {
      // First transaction has no matching public key
      mockUseCases.fulcrum.getTransactions.resolves({
        transactions: [
          { tx_hash: 'tx1' },
          { tx_hash: 'tx2' }
        ]
      })

      // Return different data for each tx - first tx has input with non-matching key
      mockUseCases.rawtransactions.getRawTransaction
        .onFirstCall().resolves({
          vin: [
            {
              scriptSig: {
                asm: 'sig 02aaa111bbb222ccc'
              }
            }
          ]
        })
        .onSecondCall().resolves({
          vin: [
            {
              scriptSig: {
                asm: 'sig 02abc123def456789'
              }
            }
          ]
        })

      // First tx doesn't match, second tx matches
      mockBchjs.ECPair.toCashAddress
        .onFirstCall().returns('bitcoincash:qqq000000000000000000000000000000000000000')
        .onSecondCall().returns('bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf')

      const result = await uut.getPublicKey({ address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf' })

      assert.isTrue(result.success)
      assert.equal(result.publicKey, '02abc123def456789')
      assert.equal(mockUseCases.rawtransactions.getRawTransaction.callCount, 2)
    })

    it('should search through multiple inputs in a transaction', async () => {
      mockUseCases.rawtransactions.getRawTransaction.resolves({
        vin: [
          {
            scriptSig: {
              asm: 'sig 02aaa111bbb222ccc'
            }
          },
          {
            scriptSig: {
              asm: 'sig 02abc123def456789'
            }
          }
        ]
      })

      // First input doesn't match, second input matches
      mockBchjs.ECPair.toCashAddress
        .onFirstCall().returns('bitcoincash:qqq000000000000000000000000000000000000000')
        .onSecondCall().returns('bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf')

      const result = await uut.getPublicKey({ address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf' })

      assert.isTrue(result.success)
      assert.equal(result.publicKey, '02abc123def456789')
    })

    it('should propagate fulcrum errors', async () => {
      const error = new Error('Fulcrum API error')
      mockUseCases.fulcrum.getTransactions.rejects(error)

      try {
        await uut.getPublicKey({ address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf' })
        assert.fail('Should have thrown an error')
      } catch (err) {
        assert.equal(err.message, 'Fulcrum API error')
      }
    })

    it('should propagate rawtransactions errors', async () => {
      const error = new Error('RawTransactions API error')
      mockUseCases.rawtransactions.getRawTransaction.rejects(error)

      try {
        await uut.getPublicKey({ address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf' })
        assert.fail('Should have thrown an error')
      } catch (err) {
        assert.equal(err.message, 'RawTransactions API error')
      }
    })
  })
})
