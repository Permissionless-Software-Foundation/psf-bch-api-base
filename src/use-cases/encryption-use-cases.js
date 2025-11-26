/*
  Use cases for encryption-related operations.
  Retrieves public keys from the blockchain for BCH addresses.
*/

// Global npm libraries
import BCHJS from '@psf/bch-js'

// Local libraries
import wlogger from '../adapters/wlogger.js'
import config from '../config/index.js'

const bchjs = new BCHJS({ restURL: config.restURL })

class EncryptionUseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters instance required when instantiating Encryption use cases.')
    }

    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error('UseCases instance required when instantiating Encryption use cases.')
    }

    // Allow bchjs to be injected for testing
    this.bchjs = localConfig.bchjs || bchjs
  }

  /**
   * Get the public key for a BCH address by searching the blockchain.
   * Searches the transaction history of the address for a transaction input
   * that contains the public key.
   *
   * @param {Object} params - Parameters object
   * @param {string} params.address - BCH address (cash address or legacy format)
   * @returns {Promise<Object>} Object with success status and publicKey if found
   */
  async getPublicKey ({ address }) {
    try {
      // Convert to cash address format
      const cashAddr = this.bchjs.Address.toCashAddress(address)

      // Get transaction history for the address
      const txHistory = await this.useCases.fulcrum.getTransactions({ address: cashAddr })

      // Extract just the TXIDs
      const txids = txHistory.transactions.map((elem) => elem.tx_hash)

      // Throw error if there is no transaction history
      if (!txids || txids.length === 0) {
        throw new Error('No transaction history.')
      }

      // Loop through the transaction history and search for the public key
      for (let i = 0; i < txids.length; i++) {
        const thisTx = txids[i]

        // Get verbose transaction details
        const txDetails = await this.useCases.rawtransactions.getRawTransaction({
          txid: thisTx,
          verbose: true
        })

        const vin = txDetails.vin

        // Loop through each input
        for (let j = 0; j < vin.length; j++) {
          const thisVin = vin[j]

          // Skip if no scriptSig (e.g., coinbase transactions)
          if (!thisVin.scriptSig || !thisVin.scriptSig.asm) {
            continue
          }

          // Extract the script signature
          const scriptSig = thisVin.scriptSig.asm.split(' ')

          // Extract the public key from the script signature (last element)
          const pubKey = scriptSig[scriptSig.length - 1]

          // Skip if pubKey is not a valid hex string (basic validation)
          if (!pubKey || !/^[0-9a-fA-F]+$/.test(pubKey)) {
            continue
          }

          try {
            // Generate cash address from public key
            const keyBuf = Buffer.from(pubKey, 'hex')
            const ec = this.bchjs.ECPair.fromPublicKey(keyBuf)
            const cashAddr2 = this.bchjs.ECPair.toCashAddress(ec)

            // If public keys match, this is the correct public key
            if (cashAddr === cashAddr2) {
              return {
                success: true,
                publicKey: pubKey
              }
            }
          } catch (err) {
            // Skip invalid public keys - continue searching
            continue
          }
        }
      }

      // Public key not found in any transaction
      return {
        success: false,
        publicKey: 'not found'
      }
    } catch (err) {
      wlogger.error('Error in EncryptionUseCases.getPublicKey()', err)
      throw err
    }
  }
}

export default EncryptionUseCases
