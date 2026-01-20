/*
  REST API router for /encryption routes.
*/

import express from 'express'
import EncryptionRESTController from './controller.js'

class EncryptionRouter {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Encryption REST Router.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating Encryption REST Router.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    this.encryptionController = new EncryptionRESTController(dependencies)

    this.apiPrefix = (localConfig.apiPrefix || '').replace(/\/$/, '')
    this.baseUrl = `${this.apiPrefix}/encryption`
    if (!this.baseUrl.startsWith('/')) {
      this.baseUrl = `/${this.baseUrl}`
    }
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error('Must pass app object when attaching REST API controllers.')
    }

    this.router.get('/', this.encryptionController.root)
    this.router.get('/publickey/:address', this.encryptionController.getPublicKey)

    app.use(this.baseUrl, this.router)
  }
}

export default EncryptionRouter
