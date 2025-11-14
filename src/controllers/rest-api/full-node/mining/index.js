/*
  REST API router for /full-node/mining routes.
*/

import express from 'express'
import MiningRESTController from './controller.js'

class MiningRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Mining REST Router.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating Mining REST Router.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    this.miningController = new MiningRESTController(dependencies)

    this.apiPrefix = (localConfig.apiPrefix || '').replace(/\/$/, '')
    this.baseUrl = `${this.apiPrefix}/full-node/mining`
    if (!this.baseUrl.startsWith('/')) {
      this.baseUrl = `/${this.baseUrl}`
    }
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error('Must pass app object when attaching REST API controllers.')
    }

    this.router.get('/', this.miningController.root)
    this.router.get('/getMiningInfo', this.miningController.getMiningInfo)
    this.router.get('/getNetworkHashPS', this.miningController.getNetworkHashPS)

    app.use(this.baseUrl, this.router)
  }
}

export default MiningRouter
