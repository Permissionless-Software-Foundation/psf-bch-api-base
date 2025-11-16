/*
  REST API router for /slp routes.
*/

import express from 'express'
import SlpRESTController from './controller.js'

class SlpRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating SLP REST Router.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating SLP REST Router.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    this.slpController = new SlpRESTController(dependencies)

    this.apiPrefix = (localConfig.apiPrefix || '').replace(/\/$/, '')
    this.baseUrl = `${this.apiPrefix}/slp`
    if (!this.baseUrl.startsWith('/')) {
      this.baseUrl = `/${this.baseUrl}`
    }
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error('Must pass app object when attaching REST API controllers.')
    }

    this.router.get('/', this.slpController.root)
    this.router.get('/status', this.slpController.getStatus)
    this.router.post('/address', this.slpController.getAddress)
    this.router.post('/txid', this.slpController.getTxid)
    this.router.post('/token', this.slpController.getTokenStats)
    this.router.post('/token/data', this.slpController.getTokenData)

    app.use(this.baseUrl, this.router)
  }
}

export default SlpRouter
