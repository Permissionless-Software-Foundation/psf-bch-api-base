/*
  Unit tests for ControlUseCases.
*/

import { assert } from 'chai'

import ControlUseCases from '../../../src/use-cases/full-node-control-use-cases.js'

describe('#full-node-control-use-cases.js', () => {
  let mockAdapters
  let uut

  beforeEach(() => {
    mockAdapters = {
      fullNode: {
        call: async () => ({})
      }
    }

    uut = new ControlUseCases({ adapters: mockAdapters })
  })

  describe('#constructor()', () => {
    it('should require adapters', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new ControlUseCases()
      }, /Adapters instance required/)
    })

    it('should require full node adapter', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new ControlUseCases({ adapters: {} })
      }, /Full node adapter required/)
    })
  })

  describe('#getNetworkInfo()', () => {
    it('should call full node adapter with correct method', async () => {
      let capturedMethod = ''
      mockAdapters.fullNode.call = async method => {
        capturedMethod = method
        return { version: 1 }
      }

      const result = await uut.getNetworkInfo()

      assert.equal(capturedMethod, 'getnetworkinfo')
      assert.deepEqual(result, { version: 1 })
    })
  })
})
