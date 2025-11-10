/*
  REST API router for /full-node/dsproof routes.
*/

import express from 'express'
import DSProofRESTController from './controller.js'

class DSProofRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating DSProof REST Router.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating DSProof REST Router.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    this.dsproofController = new DSProofRESTController(dependencies)

    this.baseUrl = '/full-node/dsproof'
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error('Must pass app object when attaching REST API controllers.')
    }

    this.router.get('/', this.dsproofController.root)
    this.router.get('/getDSProof/:txid', this.dsproofController.getDSProof)

    app.use(this.baseUrl, this.router)
  }
}

export default DSProofRouter
