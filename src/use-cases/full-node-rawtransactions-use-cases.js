/*
  Use cases for interacting with the BCH full node raw transactions RPC interface.
*/

import wlogger from '../adapters/wlogger.js'

class RawTransactionsUseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error('Adapters instance required when instantiating RawTransactions use cases.')
    }

    this.fullNode = this.adapters.fullNode
    if (!this.fullNode) {
      throw new Error('Full node adapter required when instantiating RawTransactions use cases.')
    }
  }

  async decodeRawTransaction ({ hex }) {
    return this.fullNode.call('decoderawtransaction', [hex])
  }

  async decodeRawTransactions ({ hexes }) {
    try {
      const promises = hexes.map(hex =>
        this.fullNode.call('decoderawtransaction', [hex], `decoderawtransaction-${hex.slice(0, 16)}`)
      )

      return await Promise.all(promises)
    } catch (err) {
      wlogger.error('Error in RawTransactionsUseCases.decodeRawTransactions()', err)
      throw err
    }
  }

  async decodeScript ({ hex }) {
    return this.fullNode.call('decodescript', [hex])
  }

  async decodeScripts ({ hexes }) {
    try {
      const promises = hexes.map(hex =>
        this.fullNode.call('decodescript', [hex], `decodescript-${hex.slice(0, 16)}`)
      )

      return await Promise.all(promises)
    } catch (err) {
      wlogger.error('Error in RawTransactionsUseCases.decodeScripts()', err)
      throw err
    }
  }

  async getRawTransaction ({ txid, verbose = false }) {
    const verboseInt = verbose ? 1 : 0
    return this.fullNode.call('getrawtransaction', [txid, verboseInt])
  }

  async getRawTransactions ({ txids, verbose = false }) {
    try {
      const verboseInt = verbose ? 1 : 0
      const promises = txids.map(txid =>
        this.fullNode.call('getrawtransaction', [txid, verboseInt], `getrawtransaction-${txid}`)
      )

      return await Promise.all(promises)
    } catch (err) {
      wlogger.error('Error in RawTransactionsUseCases.getRawTransactions()', err)
      throw err
    }
  }

  async getRawTransactionWithHeight ({ txid, verbose = false }) {
    const verboseInt = verbose ? 1 : 0
    const data = await this.fullNode.call('getrawtransaction', [txid, verboseInt])

    if (verbose && data && data.blockhash) {
      data.height = null
      try {
        // Look up the block height and append it to the TX response.
        const blockHeader = await this.fullNode.call('getblockheader', [data.blockhash, true])
        data.height = blockHeader.height
      } catch (err) {
        // Exit quietly if block header lookup fails
        wlogger.debug('Could not fetch block header for height lookup', err)
      }
    }

    return data
  }

  async getBlockHeader ({ blockHash, verbose = false }) {
    return this.fullNode.call('getblockheader', [blockHash, verbose])
  }

  async sendRawTransaction ({ hex }) {
    return this.fullNode.call('sendrawtransaction', [hex])
  }

  async sendRawTransactions ({ hexes }) {
    // Dev Note: Sending the 'sendrawtransaction' RPC call to a full node in parallel will
    // not work. Testing showed that the full node will return the same TXID for
    // different TX hexes. I believe this is by design, to prevent double spends.
    // In parallel, we are essentially asking the node to broadcast a new TX before
    // it's finished broadcasting the previous one. Serial execution is required.
    try {
      const result = []
      for (const hex of hexes) {
        const txid = await this.fullNode.call('sendrawtransaction', [hex], `sendrawtransaction-${hex.slice(0, 16)}`)
        result.push(txid)
      }
      return result
    } catch (err) {
      wlogger.error('Error in RawTransactionsUseCases.sendRawTransactions()', err)
      throw err
    }
  }
}

export default RawTransactionsUseCases
