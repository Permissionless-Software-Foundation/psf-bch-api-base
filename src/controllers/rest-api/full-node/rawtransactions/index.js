/*
  REST API router for /full-node/rawtransactions routes.
*/

import express from 'express'
import RawTransactionsRESTController from './controller.js'

class RawTransactionsRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating RawTransactions REST Router.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating RawTransactions REST Router.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    this.rawtransactionsController = new RawTransactionsRESTController(dependencies)

    this.apiPrefix = (localConfig.apiPrefix || '').replace(/\/$/, '')
    this.baseUrl = `${this.apiPrefix}/full-node/rawtransactions`
    if (!this.baseUrl.startsWith('/')) {
      this.baseUrl = `/${this.baseUrl}`
    }
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error('Must pass app object when attaching REST API controllers.')
    }

    this.router.get('/', this.rawtransactionsController.root)
    this.router.get('/decodeRawTransaction/:hex', this.rawtransactionsController.decodeRawTransactionSingle)
    this.router.post('/decodeRawTransaction', this.rawtransactionsController.decodeRawTransactionBulk)
    this.router.get('/decodeScript/:hex', this.rawtransactionsController.decodeScriptSingle)
    this.router.post('/decodeScript', this.rawtransactionsController.decodeScriptBulk)
    this.router.get('/getRawTransaction/:txid', this.rawtransactionsController.getRawTransactionSingle)
    this.router.post('/getRawTransaction', this.rawtransactionsController.getRawTransactionBulk)
    this.router.get('/sendRawTransaction/:hex', this.rawtransactionsController.sendRawTransactionSingle)
    this.router.post('/sendRawTransaction', this.rawtransactionsController.sendRawTransactionBulk)

    app.use(this.baseUrl, this.router)
  }
}

export default RawTransactionsRouter
