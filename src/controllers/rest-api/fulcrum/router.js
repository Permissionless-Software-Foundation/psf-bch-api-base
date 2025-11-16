/*
  REST API router for /full-node/fulcrum routes.
*/

import express from 'express'
import FulcrumRESTController from './controller.js'

class FulcrumRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Fulcrum REST Router.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating Fulcrum REST Router.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    this.fulcrumController = new FulcrumRESTController(dependencies)

    this.apiPrefix = (localConfig.apiPrefix || '').replace(/\/$/, '')
    this.baseUrl = `${this.apiPrefix}/fulcrum`
    if (!this.baseUrl.startsWith('/')) {
      this.baseUrl = `/${this.baseUrl}`
    }
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error('Must pass app object when attaching REST API controllers.')
    }

    this.router.get('/', this.fulcrumController.root)
    this.router.get('/balance/:address', this.fulcrumController.getBalance)
    this.router.post('/balance', this.fulcrumController.balanceBulk)
    this.router.get('/utxos/:address', this.fulcrumController.getUtxos)
    this.router.post('/utxos', this.fulcrumController.utxosBulk)
    this.router.get('/tx/data/:txid', this.fulcrumController.getTransactionDetails)
    this.router.post('/tx/data', this.fulcrumController.transactionDetailsBulk)
    this.router.post('/tx/broadcast', this.fulcrumController.broadcastTransaction)
    this.router.get('/block/headers/:height', this.fulcrumController.getBlockHeaders)
    this.router.post('/block/headers', this.fulcrumController.blockHeadersBulk)
    this.router.get('/transactions/:address', this.fulcrumController.getTransactions)
    this.router.get('/transactions/:address/:allTxs', this.fulcrumController.getTransactions)
    this.router.post('/transactions', this.fulcrumController.transactionsBulk)
    this.router.get('/unconfirmed/:address', this.fulcrumController.getMempool)
    this.router.post('/unconfirmed', this.fulcrumController.mempoolBulk)

    app.use(this.baseUrl, this.router)
  }
}

export default FulcrumRouter
