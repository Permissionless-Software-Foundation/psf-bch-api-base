/*
  Use cases for interacting with the Fulcrum API service.
*/

import wlogger from '../adapters/wlogger.js'
import BCHJS from '@psf/bch-js'
import config from '../config/index.js'

// Use RESTURL (from test) or REST_URL (from psf-bch-api config) or fallback to config
const restURL = process.env.RESTURL || process.env.REST_URL || process.env.LOCAL_RESTURL || config.restURL
// Use BCHJSBEARERTOKEN (from test) or BASIC_AUTH_TOKEN (from psf-bch-api config) or fallback to config
const bearerToken = process.env.BCHJSBEARERTOKEN || process.env.BASIC_AUTH_TOKEN || config.basicAuth.token

const bchjs = new BCHJS({
  restURL,
  bearerToken
})

class FulcrumUseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error('Adapters instance required when instantiating Fulcrum use cases.')
    }

    this.fulcrum = this.adapters.fulcrum
    if (!this.fulcrum) {
      throw new Error('Fulcrum adapter required when instantiating Fulcrum use cases.')
    }

    // Allow bchjs to be injected for testing
    this.bchjs = localConfig.bchjs || bchjs
  }

  async getBalance ({ address }) {
    return this.fulcrum.get(`electrumx/balance/${address}`)
  }

  async getBalances ({ addresses }) {
    try {
      const response = await this.fulcrum.post('electrumx/balance/', { addresses })
      return response
    } catch (err) {
      wlogger.error('Error in FulcrumUseCases.getBalances()', err)
      throw err
    }
  }

  async getUtxos ({ address }) {
    return this.fulcrum.get(`electrumx/utxos/${address}`)
  }

  async getUtxosBulk ({ addresses }) {
    try {
      const response = await this.fulcrum.post('electrumx/utxos/', { addresses })
      return response
    } catch (err) {
      wlogger.error('Error in FulcrumUseCases.getUtxosBulk()', err)
      throw err
    }
  }

  async getTransactionDetails ({ txid }) {
    try {
      const response = await this.fulcrum.get(`electrumx/tx/data/${txid}`)
      // console.log(`getTransactionDetails() TXID ${txid}: ${JSON.stringify(response, null, 2)}`)
      return response
    } catch (err) {
      wlogger.error('Error in FulcrumUseCases.getTransactionDetails()', err)
      throw err
    }
  }

  async getTransactionDetailsBulk ({ txids, verbose }) {
    try {
      const response = await this.fulcrum.post('electrumx/tx/data', { txids, verbose })
      return response
    } catch (err) {
      wlogger.error('Error in FulcrumUseCases.getTransactionDetailsBulk()', err)
      throw err
    }
  }

  async broadcastTransaction ({ txHex }) {
    try {
      const response = await this.fulcrum.post('electrumx/tx/broadcast', { txHex })
      return response
    } catch (err) {
      wlogger.error('Error in FulcrumUseCases.broadcastTransaction()', err)
      throw err
    }
  }

  async getBlockHeaders ({ height, count }) {
    return this.fulcrum.get(`electrumx/block/headers/${height}?count=${count}`)
  }

  async getBlockHeadersBulk ({ heights }) {
    try {
      const response = await this.fulcrum.post('electrumx/block/headers', { heights })
      return response
    } catch (err) {
      wlogger.error('Error in FulcrumUseCases.getBlockHeadersBulk()', err)
      throw err
    }
  }

  async getTransactions ({ address, allTxs, bearerToken = null }) {
    try {
      const response = await this.fulcrum.get(`electrumx/transactions/${address}`)

      // Sort transactions in descending order, so that newest transactions are first.
      if (response.transactions && Array.isArray(response.transactions)) {
        // Use bearer token from request if provided, otherwise use the default bchjs instance
        let bchjsInstance = this.bchjs
        if (bearerToken) {
          // Create a temporary bchjs instance with the bearer token from the request
          const restURL = process.env.RESTURL || process.env.REST_URL || process.env.LOCAL_RESTURL || config.restURL
          bchjsInstance = new BCHJS({
            restURL,
            bearerToken
          })
        }

        response.transactions = await bchjsInstance.Electrumx.sortAllTxs(response.transactions, 'DESCENDING')

        if (!allTxs) {
          // Return only the first 100 transactions of the history.
          response.transactions = response.transactions.slice(0, 100)
        }
      }

      return response
    } catch (err) {
      wlogger.error('Error in FulcrumUseCases.getTransactions()', err)
      throw err
    }
  }

  async getTransactionsBulk ({ addresses, allTxs, bearerToken = null }) {
    try {
      const response = await this.fulcrum.post('electrumx/transactions/', { addresses })

      // Sort transactions in descending order for each address entry.
      if (response.transactions && Array.isArray(response.transactions)) {
        // Use bearer token from request if provided, otherwise use the default bchjs instance
        let bchjsInstance = this.bchjs
        
        // console.log('getTransactionsBulk() bearerToken: ', bearerToken)
        if (bearerToken) {
          // Create a temporary bchjs instance with the bearer token from the request
          const restURL = config.restURL

          // console.log('getTransactionsBulk() restURL: ', restURL)
          bchjsInstance = new BCHJS({
            restURL,
            bearerToken
          })
        }

        for (let i = 0; i < response.transactions.length; i++) {
          const thisEntry = response.transactions[i]
          if (thisEntry.transactions && Array.isArray(thisEntry.transactions)) {
            thisEntry.transactions = await bchjsInstance.Electrumx.sortAllTxs(thisEntry.transactions, 'DESCENDING')

            if (!allTxs && thisEntry.transactions.length > 100) {
              // Extract only the first 100 transactions.
              thisEntry.transactions = thisEntry.transactions.slice(0, 100)
            }
          }
        }
      }

      return response
    } catch (err) {
      wlogger.error('Error in FulcrumUseCases.getTransactionsBulk()', err)
      throw err
    }
  }

  async getMempool ({ address }) {
    return this.fulcrum.get(`electrumx/unconfirmed/${address}`)
  }

  async getMempoolBulk ({ addresses }) {
    try {
      const response = await this.fulcrum.post('electrumx/unconfirmed/', { addresses })
      return response
    } catch (err) {
      wlogger.error('Error in FulcrumUseCases.getMempoolBulk()', err)
      throw err
    }
  }
}

export default FulcrumUseCases
