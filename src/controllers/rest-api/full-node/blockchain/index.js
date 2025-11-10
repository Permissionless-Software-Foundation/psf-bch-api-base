/*
  REST API router for /full-node/blockchain routes.
*/

import express from 'express'
import BlockchainRESTController from './controller.js'

class BlockchainRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Blockchain REST Router.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating Blockchain REST Router.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    this.blockchainController = new BlockchainRESTController(dependencies)

    this.baseUrl = '/full-node/blockchain'
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error('Must pass app object when attaching REST API controllers.')
    }

    this.router.get('/', this.blockchainController.root)
    this.router.get('/getBestBlockHash', this.blockchainController.getBestBlockHash)
    this.router.get('/getBlockchainInfo', this.blockchainController.getBlockchainInfo)
    this.router.get('/getBlockCount', this.blockchainController.getBlockCount)
    this.router.get('/getBlockHeader/:hash', this.blockchainController.getBlockHeaderSingle)
    this.router.post('/getBlockHeader', this.blockchainController.getBlockHeaderBulk)
    this.router.get('/getChainTips', this.blockchainController.getChainTips)
    this.router.get('/getDifficulty', this.blockchainController.getDifficulty)
    this.router.get('/getMempoolEntry/:txid', this.blockchainController.getMempoolEntrySingle)
    this.router.post('/getMempoolEntry', this.blockchainController.getMempoolEntryBulk)
    this.router.get('/getMempoolAncestors/:txid', this.blockchainController.getMempoolAncestorsSingle)
    this.router.get('/getMempoolInfo', this.blockchainController.getMempoolInfo)
    this.router.get('/getRawMempool', this.blockchainController.getRawMempool)
    this.router.get('/getTxOut/:txid/:n', this.blockchainController.getTxOut)
    this.router.post('/getTxOut', this.blockchainController.getTxOutPost)
    this.router.get('/getTxOutProof/:txid', this.blockchainController.getTxOutProofSingle)
    this.router.post('/getTxOutProof', this.blockchainController.getTxOutProofBulk)
    this.router.get('/verifyTxOutProof/:proof', this.blockchainController.verifyTxOutProofSingle)
    this.router.post('/verifyTxOutProof', this.blockchainController.verifyTxOutProofBulk)
    this.router.post('/getBlock', this.blockchainController.getBlock)
    this.router.get('/getBlockHash/:height', this.blockchainController.getBlockHash)

    app.use(this.baseUrl, this.router)
  }
}

export default BlockchainRouter
