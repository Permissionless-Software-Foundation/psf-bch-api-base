/*
  Use cases for interacting with the BCH full node blockchain RPC interface.
*/

import wlogger from '../adapters/wlogger.js'

class BlockchainUseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error('Adapters instance required when instantiating Blockchain use cases.')
    }

    this.fullNode = this.adapters.fullNode
    if (!this.fullNode) {
      throw new Error('Full node adapter required when instantiating Blockchain use cases.')
    }
  }

  async getBestBlockHash () {
    return this.fullNode.call('getbestblockhash')
  }

  async getBlockchainInfo () {
    return this.fullNode.call('getblockchaininfo')
  }

  async getBlockCount () {
    return this.fullNode.call('getblockcount')
  }

  async getBlockHeader ({ hash, verbose = false }) {
    return this.fullNode.call('getblockheader', [hash, verbose])
  }

  async getBlockHeaders ({ hashes, verbose = false }) {
    try {
      const promises = hashes.map(hash =>
        this.fullNode.call('getblockheader', [hash, verbose], `getblockheader-${hash}`)
      )

      return await Promise.all(promises)
    } catch (err) {
      wlogger.error('Error in BlockchainUseCases.getBlockHeaders()', err)
      throw err
    }
  }

  async getChainTips () {
    return this.fullNode.call('getchaintips')
  }

  async getDifficulty () {
    return this.fullNode.call('getdifficulty')
  }

  async getMempoolEntry ({ txid }) {
    return this.fullNode.call('getmempoolentry', [txid])
  }

  async getMempoolEntries ({ txids }) {
    try {
      const promises = txids.map(txid =>
        this.fullNode.call('getmempoolentry', [txid], `getmempoolentry-${txid}`)
      )

      return await Promise.all(promises)
    } catch (err) {
      wlogger.error('Error in BlockchainUseCases.getMempoolEntries()', err)
      throw err
    }
  }

  async getMempoolAncestors ({ txid, verbose = false }) {
    return this.fullNode.call('getmempoolancestors', [txid, verbose])
  }

  async getMempoolInfo () {
    return this.fullNode.call('getmempoolinfo')
  }

  async getRawMempool ({ verbose = false }) {
    return this.fullNode.call('getrawmempool', [verbose])
  }

  async getTxOut ({ txid, n, includeMempool }) {
    return this.fullNode.call('gettxout', [txid, n, includeMempool])
  }

  async getTxOutProof ({ txid }) {
    return this.fullNode.call('gettxoutproof', [[txid]])
  }

  async getTxOutProofs ({ txids }) {
    try {
      const promises = txids.map(txid =>
        this.fullNode.call('gettxoutproof', [[txid]], `gettxoutproof-${txid}`)
      )

      return await Promise.all(promises)
    } catch (err) {
      wlogger.error('Error in BlockchainUseCases.getTxOutProofs()', err)
      throw err
    }
  }

  async verifyTxOutProof ({ proof }) {
    return this.fullNode.call('verifytxoutproof', [proof])
  }

  async verifyTxOutProofs ({ proofs }) {
    try {
      const promises = proofs.map(proof =>
        this.fullNode.call('verifytxoutproof', [proof], `verifytxoutproof-${proof.slice(0, 16)}`)
      )

      return await Promise.all(promises)
    } catch (err) {
      wlogger.error('Error in BlockchainUseCases.verifyTxOutProofs()', err)
      throw err
    }
  }

  async getBlock ({ blockhash, verbosity }) {
    return this.fullNode.call('getblock', [blockhash, verbosity])
  }

  async getBlockHash ({ height }) {
    return this.fullNode.call('getblockhash', [height])
  }
}

export default BlockchainUseCases
