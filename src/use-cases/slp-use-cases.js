/*
  Use cases for interacting with the SLP Indexer API service.
*/

import wlogger from '../adapters/wlogger.js'
import BCHJS from '@psf/bch-js'
import SlpWallet from 'minimal-slp-wallet'
import SlpTokenMedia from 'slp-token-media'
import axios from 'axios'
import config from '../config/index.js'

const bchjs = new BCHJS()

class SlpUseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error('Adapters instance required when instantiating SLP use cases.')
    }

    this.slpIndexer = this.adapters.slpIndexer
    if (!this.slpIndexer) {
      throw new Error('SLP Indexer adapter required when instantiating SLP use cases.')
    }

    // Allow bchjs to be injected for testing
    this.bchjs = localConfig.bchjs || bchjs

    // Get config
    this.config = localConfig.config || config

    // Initialize wallet (lazy initialization)
    this.wallet = null
    this.slpTokenMedia = null
    this.walletInitialized = false
    this.initializationPromise = null
  }

  // Initialize wallet and SlpTokenMedia asynchronously
  async _ensureInitialized () {
    if (this.walletInitialized) {
      return
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this._initialize()
    return this.initializationPromise
  }

  async _initialize () {
    try {
      // Initialize wallet
      this.wallet = new SlpWallet(undefined, {
        restURL: this.config.restURL,
        interface: 'rest-api'
      })

      // Wait for wallet to initialize
      await this.wallet.walletInfoPromise

      // Initialize SlpTokenMedia
      this.slpTokenMedia = new SlpTokenMedia({
        wallet: this.wallet,
        ipfsGatewayUrl: this.config.ipfsGateway
      })

      this.walletInitialized = true
      wlogger.info('SLP wallet and token media initialized')
    } catch (err) {
      wlogger.error('Error initializing SLP wallet:', err)
      throw err
    }
  }

  async getStatus () {
    try {
      return await this.slpIndexer.get('slp/status/')
    } catch (err) {
      wlogger.error('Error in SlpUseCases.getStatus()', err)
      throw err
    }
  }

  async getAddress ({ address }) {
    try {
      return await this.slpIndexer.post('slp/address/', { address })
    } catch (err) {
      wlogger.error('Error in SlpUseCases.getAddress()', err)
      throw err
    }
  }

  async getTxid ({ txid }) {
    try {
      return await this.slpIndexer.post('slp/tx/', { txid })
    } catch (err) {
      wlogger.error('Error in SlpUseCases.getTxid()', err)
      throw err
    }
  }

  async getTokenStats ({ tokenId, withTxHistory = false }) {
    try {
      return await this.slpIndexer.post('slp/token/', { tokenId, withTxHistory })
    } catch (err) {
      wlogger.error('Error in SlpUseCases.getTokenStats()', err)
      throw err
    }
  }

  async getTokenData ({ tokenId, withTxHistory = false }) {
    try {
      const tokenData = {}

      // Get token stats from the Genesis TX of the token
      const response = await this.slpIndexer.post('slp/token/', { tokenId, withTxHistory })
      const tokenStats = response.tokenData

      tokenData.genesisData = tokenStats

      // Try to get immutable data
      try {
        const immutableData = tokenStats.documentUri
        tokenData.immutableData = immutableData || ''
      } catch (error) {
        tokenData.immutableData = ''
      }

      // Try to get mutable data
      try {
        const mutableData = await this.getMutableCid({ tokenStats })
        tokenData.mutableData = mutableData || ''
      } catch (error) {
        wlogger.warn('Error getting mutable data:', error)
        tokenData.mutableData = ''
      }

      return tokenData
    } catch (err) {
      wlogger.error('Error in SlpUseCases.getTokenData()', err)
      throw err
    }
  }

  async getTokenData2 ({ tokenId, updateCache }) {
    try {
      await this._ensureInitialized()

      const tokenData = await this.slpTokenMedia.getIcon({ tokenId, updateCache })
      return tokenData
    } catch (err) {
      wlogger.error('Error in SlpUseCases.getTokenData2()', err)
      throw err
    }
  }

  async getMutableCid ({ tokenStats }) {
    // Validate input - this should throw, not be caught
    if (!tokenStats || !tokenStats.documentHash) {
      throw new Error('No documentHash property found in tokenStats')
    }

    try {
      await this._ensureInitialized()

      // Get the OP_RETURN data and decode it
      const mutableData = await this.decodeOpReturn({ txid: tokenStats.documentHash })
      const jsonData = JSON.parse(mutableData)

      // mda = mutable data address
      const mda = jsonData.mda

      // Get the mda transaction history
      const transactions = await this.wallet.getTransactions(mda)
      wlogger.info(`MDA has ${transactions.length} transactions in its history.`)

      const mdaTxs = transactions

      let data = false

      // These are used to filter blockchain data to find the most recent
      // update to the MDA
      let largestBlock = 700000
      let largestTimestamp = 1666107111271
      let bestEntry

      // Used to track the number of transactions before the best candidate is found
      let txCnt = 0

      // Map each transaction of the mda
      // If it finds an OP_RETURN, decode it and exit the loop
      for (let i = 0; i < mdaTxs.length; i++) {
        const tx = mdaTxs[i]
        const txid = tx.tx_hash
        txCnt++

        data = await this.decodeOpReturn({ txid })

        // Try parse the OP_RETURN data to a JSON object
        if (data) {
          try {
            // Convert the OP_RETURN data to a JSON object
            const obj = JSON.parse(data)

            // Keep searching if this TX does not have a cid value
            if (!obj.cid) continue

            // Ensure data was generated by the MDA
            const txData = await this.wallet.getTxData([txid])
            const vinAddress = txData[0].vin[0].address

            // Skip entry if it was not made by the MDA private key
            if (mda !== vinAddress) {
              continue
            }

            // First best entry found
            if (!bestEntry) {
              bestEntry = data
              largestBlock = tx.height

              if (obj.ts) {
                largestTimestamp = obj.ts
              }
            } else {
              // One candidate already found. Looking for potentially better entry

              if (tx.height < largestBlock) {
                // Exit loop if next candidate has an older block height
                break
              }

              if (obj.ts && obj.ts < largestTimestamp) {
                // Continue looping through entries if the current entry in
                // the same block has a smaller timestamp
                continue
              }

              bestEntry = data
              largestBlock = tx.height
              if (obj.ts) {
                largestTimestamp = obj.ts
              }
            }
          } catch (error) {
            continue
          }
        }
      }

      wlogger.info(`${txCnt} transactions reviewed to find mutable data.`)

      if (!bestEntry) {
        return false
      }

      // Get the CID
      const obj = JSON.parse(bestEntry)
      const cid = obj.cid

      if (!cid) {
        return false
      }

      // Assuming that CID starts with ipfs://. Cutting out that prefix
      const mutableCid = cid.substring(7)

      return mutableCid
    } catch (err) {
      wlogger.error('Error in SlpUseCases.getMutableCid()', err)
      return false
    }
  }

  async decodeOpReturn ({ txid }) {
    try {
      if (!txid || typeof txid !== 'string') {
        throw new Error('txid must be a string.')
      }

      // Get transaction data
      const txData = await this.bchjs.Electrumx.txData(txid)
      let data = false

      // Map the vout of the transaction in search of an OP_RETURN
      for (let i = 0; i < txData.details.vout.length; i++) {
        const vout = txData.details.vout[i]

        const script = this.bchjs.Script.toASM(
          Buffer.from(vout.scriptPubKey.hex, 'hex')
        ).split(' ')

        // Exit on the first OP_RETURN found
        if (script[0] === 'OP_RETURN') {
          data = Buffer.from(script[1], 'hex').toString('ascii')
          break
        }
      }

      return data
    } catch (error) {
      wlogger.error('Error in SlpUseCases.decodeOpReturn()', error)
      throw error
    }
  }

  async getCIDData ({ cid }) {
    try {
      if (!cid || typeof cid !== 'string') {
        throw new Error('cid must be a string.')
      }

      // Assuming that CID starts with ipfs://. Cutting out that prefix
      const cidWithoutPrefix = cid.substring(7)

      const dataUrl = `https://${cidWithoutPrefix}.ipfs.dweb.link/data.json`
      wlogger.info(`Fetching IPFS data from: ${dataUrl}`)

      const response = await axios.get(dataUrl)

      return response.data
    } catch (error) {
      wlogger.error('Error in SlpUseCases.getCIDData()', error)
      throw error
    }
  }
}

export default SlpUseCases
