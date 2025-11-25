/*
  Use cases for price-related operations.
*/

// Global npm libraries
import axios from 'axios'
import SlpWallet from 'minimal-slp-wallet'
import PSFFPP from 'psffpp'

// Local libraries
import wlogger from '../adapters/wlogger.js'
import config from '../config/index.js'

class PriceUseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error('Adapters instance required when instantiating Price use cases.')
    }

    // Get config
    this.config = localConfig.config || config

    // Coinex API URL for BCH/USDT
    this.bchCoinexPriceUrl =
      'https://api.coinex.com/v1/market/ticker?market=bchusdt'

    // Allow axios to be injected for testing
    this.axios = localConfig.axios || axios
  }

  /**
   * Get the USD price of BCH from Coinex.
   * @returns {Promise<number>} The USD price of BCH
   */
  async getBCHUSD () {
    try {
      // Request options
      const opt = {
        method: 'get',
        baseURL: this.bchCoinexPriceUrl,
        timeout: 15000
      }

      const response = await this.axios.request(opt)

      const price = Number(response.data.data.ticker.last)

      return price
    } catch (err) {
      wlogger.error('Error in PriceUseCases.getBCHUSD()', err)
      throw err
    }
  }

  /**
   * Get the PSF price for writing to the PSFFPP.
   * Returns the price to pin 1MB of content to the PSFFPP pinning
   * network on IPFS. The price is denominated in PSF tokens.
   * @returns {Promise<number>} The write price in PSF tokens
   */
  async getPsffppWritePrice () {
    try {
      const wallet = new SlpWallet(undefined, {
        interface: 'rest-api',
        restURL: this.config.restURL
      })
      await wallet.walletInfoPromise

      const psffpp = new PSFFPP({ wallet })

      const writePrice = await psffpp.getMcWritePrice()

      return writePrice
    } catch (err) {
      wlogger.error('Error in PriceUseCases.getPsffppWritePrice()', err)
      throw err
    }
  }
}

export default PriceUseCases
