/*
  Unit tests for DSProofUseCases.
*/

import { assert } from 'chai'

import DSProofUseCases from '../../../src/use-cases/full-node-dsproof-use-cases.js'

describe('#full-node-dsproof-use-cases.js', () => {
  let mockAdapters
  let uut

  beforeEach(() => {
    mockAdapters = {
      fullNode: {
        call: async () => ({})
      }
    }

    uut = new DSProofUseCases({ adapters: mockAdapters })
  })

  describe('#constructor()', () => {
    it('should require adapters', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new DSProofUseCases()
      }, /Adapters instance required/)
    })

    it('should require full node adapter', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new DSProofUseCases({ adapters: {} })
      }, /Full node adapter required/)
    })
  })

  describe('#getDSProof()', () => {
    it('should pass txid and verbose parameters to adapter', async () => {
      let capturedArgs = null
      mockAdapters.fullNode.call = async (method, params) => {
        capturedArgs = { method, params }
        return { success: true }
      }

      const result = await uut.getDSProof({ txid: 'a'.repeat(64), verbose: 2 })

      assert.equal(capturedArgs.method, 'getdsproof')
      assert.deepEqual(capturedArgs.params, ['a'.repeat(64), 2])
      assert.deepEqual(result, { success: true })
    })
  })
})
