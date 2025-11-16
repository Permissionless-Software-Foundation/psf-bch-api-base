/*
  Unit tests for SlpUseCases.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import BCHJS from '@psf/bch-js'

import SlpUseCases from '../../../src/use-cases/slp-use-cases.js'

describe('#slp-use-cases.js', () => {
  let sandbox
  let mockAdapters
  let mockConfig
  let uut
  let mockBchjs
  let mockWallet
  let mockSlpTokenMedia

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockConfig = {
      restURL: 'http://localhost:3000/v5/',
      ipfsGateway: 'p2wdb-gateway-678.fullstack.cash'
    }

    mockAdapters = {
      slpIndexer: {
        get: sandbox.stub().resolves({}),
        post: sandbox.stub().resolves({})
      }
    }

    // Create mock BCHJS
    mockBchjs = new BCHJS()
    mockBchjs.Electrumx = {
      txData: sandbox.stub().resolves({
        details: {
          vout: [
            {
              scriptPubKey: {
                hex: '6a0c48656c6c6f20576f726c6421'
              }
            }
          ]
        }
      })
    }
    mockBchjs.Script = {
      toASM: sandbox.stub().returns('OP_RETURN 48656c6c6f20576f726c6421')
    }

    // Create mock wallet
    mockWallet = {
      walletInfoPromise: Promise.resolve(),
      getTransactions: sandbox.stub().resolves([]),
      getTxData: sandbox.stub().resolves([{
        vin: [{
          address: 'bitcoincash:test123'
        }]
      }])
    }

    // Create mock SlpTokenMedia
    mockSlpTokenMedia = {
      getIcon: sandbox.stub().resolves({ tokenIcon: 'test-icon.png' })
    }

    // Mock the imports
    uut = new SlpUseCases({
      adapters: mockAdapters,
      bchjs: mockBchjs,
      config: mockConfig
    })

    // Replace the wallet initialization with our mocks
    uut.wallet = mockWallet
    uut.slpTokenMedia = mockSlpTokenMedia
    uut.walletInitialized = true
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#constructor()', () => {
    it('should require adapters', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new SlpUseCases()
      }, /Adapters instance required/)
    })

    it('should require slpIndexer adapter', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new SlpUseCases({ adapters: {} })
      }, /SLP Indexer adapter required/)
    })
  })

  describe('#getStatus()', () => {
    it('should call slpIndexer adapter get method', async () => {
      mockAdapters.slpIndexer.get.resolves({ status: 'ok' })

      const result = await uut.getStatus()

      assert.isTrue(mockAdapters.slpIndexer.get.calledOnceWith('slp/status/'))
      assert.deepEqual(result, { status: 'ok' })
    })
  })

  describe('#getAddress()', () => {
    it('should call slpIndexer adapter post method', async () => {
      const address = 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      mockAdapters.slpIndexer.post.resolves({ balance: 1000 })

      const result = await uut.getAddress({ address })

      assert.isTrue(
        mockAdapters.slpIndexer.post.calledOnceWith('slp/address/', { address })
      )
      assert.deepEqual(result, { balance: 1000 })
    })
  })

  describe('#getTxid()', () => {
    it('should call slpIndexer adapter post method', async () => {
      const txid = 'a'.repeat(64)
      mockAdapters.slpIndexer.post.resolves({ txid })

      const result = await uut.getTxid({ txid })

      assert.isTrue(
        mockAdapters.slpIndexer.post.calledOnceWith('slp/tx/', { txid })
      )
      assert.deepEqual(result, { txid })
    })
  })

  describe('#getTokenStats()', () => {
    it('should call slpIndexer adapter post method', async () => {
      const tokenId = 'a'.repeat(64)
      const withTxHistory = false
      mockAdapters.slpIndexer.post.resolves({ tokenData: {} })

      const result = await uut.getTokenStats({ tokenId, withTxHistory })

      assert.isTrue(
        mockAdapters.slpIndexer.post.calledOnceWith('slp/token/', { tokenId, withTxHistory })
      )
      assert.deepEqual(result, { tokenData: {} })
    })
  })

  describe('#getTokenData()', () => {
    it('should get token data with mutable and immutable data', async () => {
      const tokenId = 'a'.repeat(64)
      const tokenStats = {
        tokenData: {
          documentUri: 'ipfs://test123',
          documentHash: 'b'.repeat(64)
        }
      }
      mockAdapters.slpIndexer.post.resolves(tokenStats)

      // Mock decodeOpReturn to return JSON with mda
      sandbox.stub(uut, 'decodeOpReturn').resolves(JSON.stringify({ mda: 'bitcoincash:test123' }))
      sandbox.stub(uut, 'getMutableCid').resolves('mutable-cid-123')

      const result = await uut.getTokenData({ tokenId })

      assert.property(result, 'genesisData')
      assert.property(result, 'immutableData')
      assert.property(result, 'mutableData')
    })

    it('should handle errors when getting mutable data', async () => {
      const tokenId = 'a'.repeat(64)
      const tokenStats = {
        tokenData: {
          documentUri: 'ipfs://test123',
          documentHash: 'b'.repeat(64)
        }
      }
      mockAdapters.slpIndexer.post.resolves(tokenStats)

      sandbox.stub(uut, 'getMutableCid').rejects(new Error('Test error'))

      const result = await uut.getTokenData({ tokenId })

      assert.property(result, 'genesisData')
      assert.property(result, 'immutableData')
      assert.equal(result.mutableData, '')
    })
  })

  describe('#decodeOpReturn()', () => {
    it('should decode OP_RETURN data from transaction', async () => {
      const txid = 'a'.repeat(64)
      const mockTxData = {
        details: {
          vout: [
            {
              scriptPubKey: {
                hex: '6a0c48656c6c6f20576f726c6421'
              }
            }
          ]
        }
      }
      mockBchjs.Electrumx.txData.resolves(mockTxData)
      mockBchjs.Script.toASM.returns('OP_RETURN 48656c6c6f20576f726c6421')

      const result = await uut.decodeOpReturn({ txid })

      assert.isTrue(mockBchjs.Electrumx.txData.calledOnceWith(txid))
      assert.isString(result)
    })

    it('should throw error if txid is not a string', async () => {
      try {
        await uut.decodeOpReturn({ txid: null })
        assert.fail('Should have thrown an error')
      } catch (err) {
        assert.include(err.message, 'txid must be a string')
      }
    })
  })

  describe('#getCIDData()', () => {
    it('should fetch IPFS data from CID', async () => {
      const cid = 'ipfs://test123'
      const mockData = { name: 'Test Token' }

      // Mock axios
      const axios = await import('axios')
      sandbox.stub(axios.default, 'get').resolves({ data: mockData })

      const result = await uut.getCIDData({ cid })

      assert.deepEqual(result, mockData)
    })

    it('should throw error if cid is not a string', async () => {
      try {
        await uut.getCIDData({ cid: null })
        assert.fail('Should have thrown an error')
      } catch (err) {
        assert.include(err.message, 'cid must be a string')
      }
    })
  })

  describe('#getMutableCid()', () => {
    it('should extract mutable CID from token stats', async () => {
      const tokenStats = {
        documentHash: 'a'.repeat(64)
      }

      const mockOpReturn = JSON.stringify({ mda: 'bitcoincash:test123' })
      sandbox.stub(uut, 'decodeOpReturn').resolves(mockOpReturn)

      mockWallet.getTransactions.resolves([
        {
          tx_hash: 'b'.repeat(64),
          height: 100
        }
      ])

      mockWallet.getTxData.resolves([{
        vin: [{
          address: 'bitcoincash:test123'
        }]
      }])

      // Mock decodeOpReturn for the transaction
      uut.decodeOpReturn.onSecondCall().resolves(JSON.stringify({ cid: 'ipfs://mutable-cid-123', ts: 1234567890 }))

      const result = await uut.getMutableCid({ tokenStats })

      assert.isString(result)
    })

    it('should return false if no documentHash in tokenStats', async () => {
      const tokenStats = {}

      try {
        await uut.getMutableCid({ tokenStats })
        assert.fail('Should have thrown an error')
      } catch (err) {
        assert.include(err.message, 'No documentHash property found')
      }
    })
  })
})
