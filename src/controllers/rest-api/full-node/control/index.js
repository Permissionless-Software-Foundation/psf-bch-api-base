/*
  REST API router for /full-node/control routes.
*/

import express from 'express'
import ControlRESTController from './controller.js'

class ControlRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Control REST Router.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating Control REST Router.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    this.controlController = new ControlRESTController(dependencies)

    this.baseUrl = '/full-node/control'
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error('Must pass app object when attaching REST API controllers.')
    }

    this.router.get('/', this.controlController.root)
    this.router.get('/getNetworkInfo', this.controlController.getNetworkInfo)

    app.use(this.baseUrl, this.router)
  }
}

export default ControlRouter
