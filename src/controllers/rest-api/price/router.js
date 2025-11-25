/*
  REST API router for /price routes.
*/

import express from 'express'
import PriceRESTController from './controller.js'

class PriceRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Price REST Router.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating Price REST Router.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    this.priceController = new PriceRESTController(dependencies)

    this.apiPrefix = (localConfig.apiPrefix || '').replace(/\/$/, '')
    this.baseUrl = `${this.apiPrefix}/price`
    if (!this.baseUrl.startsWith('/')) {
      this.baseUrl = `/${this.baseUrl}`
    }
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error('Must pass app object when attaching REST API controllers.')
    }

    this.router.get('/', this.priceController.root)
    this.router.get('/bchusd', this.priceController.getBCHUSD)
    this.router.get('/psffpp', this.priceController.getPsffppWritePrice)

    app.use(this.baseUrl, this.router)
  }
}

export default PriceRouter
