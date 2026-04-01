/*
  Router for discovery and machine-readable metadata endpoints.
*/

import express from 'express'
import DiscoveryController from './controller.js'

class DiscoveryRouter {
  constructor (localConfig = {}) {
    this.controller = localConfig.controller || new DiscoveryController()
    this.router = express.Router()
    this.attach = this.attach.bind(this)
  }

  attach (app) {
    if (!app) {
      throw new Error('Must pass app object when attaching DiscoveryRouter.')
    }

    this.router.get('/.well-known/x402', this.controller.x402Manifest)
    this.router.get('/openapi.json', this.controller.openapi)
    this.router.get('/swagger.json', this.controller.swagger)
    this.router.get('/llms.txt', this.controller.llmsTxt)
    this.router.get('/.well-known/agent.json', this.controller.agentManifest)

    app.use(this.router)
  }
}

export default DiscoveryRouter
