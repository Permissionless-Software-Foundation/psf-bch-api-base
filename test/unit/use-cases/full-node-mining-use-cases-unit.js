/*
  Unit tests for MiningUseCases.
*/

import { assert } from 'chai'

import MiningUseCases from '../../../src/use-cases/full-node-mining-use-cases.js'

describe('#full-node-mining-use-cases.js', () => {
  let mockAdapters
  let uut

  beforeEach(() => {
    mockAdapters = {
      fullNode: {
        call: async () => ({})
      }
    }

    uut = new MiningUseCases({ adapters: mockAdapters })
  })

  describe('#constructor()', () => {
    it('should require adapters', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new MiningUseCases()
      }, /Adapters instance required/)
    })

    it('should require full node adapter', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new MiningUseCases({ adapters: {} })
      }, /Full node adapter required/)
    })
  })

  describe('#getMiningInfo()', () => {
    it('should call full node adapter with correct method', async () => {
      let capturedMethod = ''
      mockAdapters.fullNode.call = async method => {
        capturedMethod = method
        return { blocks: 100, difficulty: 1.5 }
      }

      const result = await uut.getMiningInfo()

      assert.equal(capturedMethod, 'getmininginfo')
      assert.deepEqual(result, { blocks: 100, difficulty: 1.5 })
    })
  })

  describe('#getNetworkHashPS()', () => {
    it('should call full node adapter with correct method and default params', async () => {
      let capturedMethod = ''
      let capturedParams = []
      mockAdapters.fullNode.call = async (method, params) => {
        capturedMethod = method
        capturedParams = params
        return 1234567890
      }

      const result = await uut.getNetworkHashPS({ nblocks: 120, height: -1 })

      assert.equal(capturedMethod, 'getnetworkhashps')
      assert.deepEqual(capturedParams, [120, -1])
      assert.equal(result, 1234567890)
    })

    it('should call full node adapter with custom params', async () => {
      let capturedParams = []
      mockAdapters.fullNode.call = async (method, params) => {
        capturedParams = params
        return 9876543210
      }

      const result = await uut.getNetworkHashPS({ nblocks: 240, height: 1000 })

      assert.deepEqual(capturedParams, [240, 1000])
      assert.equal(result, 9876543210)
    })
  })
})
