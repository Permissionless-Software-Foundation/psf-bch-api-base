/*
  Controller for discovery and machine-readable metadata endpoints.
*/

import config from '../../config/index.js'
import wlogger from '../../adapters/wlogger.js'
import { getX402Settings, getX402WellKnownManifest as defaultGetX402WellKnownManifest } from '../../config/x402.js'
import { getDiscoveryDocuments } from '../../discovery/build-documents.js'

class DiscoveryController {
  constructor (localConfig = {}) {
    this.getX402Settings = localConfig.getX402Settings || getX402Settings
    this.getX402WellKnownManifest =
      localConfig.getX402WellKnownManifest || defaultGetX402WellKnownManifest
    this.getDiscoveryDocuments = localConfig.getDiscoveryDocuments || getDiscoveryDocuments
    this.apiPrefix = localConfig.apiPrefix || config.apiPrefix

    this.x402Manifest = this.x402Manifest.bind(this)
    this.openapi = this.openapi.bind(this)
    this.swagger = this.swagger.bind(this)
    this.llmsTxt = this.llmsTxt.bind(this)
    this.agentManifest = this.agentManifest.bind(this)
    this.respondNotFoundWhenDisabled = this.respondNotFoundWhenDisabled.bind(this)
    this.sendText = this.sendText.bind(this)
  }

  respondNotFoundWhenDisabled (res) {
    const { enabled } = this.getX402Settings()
    if (enabled) return false

    res.status(404).json({
      error: 'Not found'
    })
    return true
  }

  /**
   * @api {get} /.well-known/x402 x402 v2 resource discovery
   * @apiName X402Discovery
   * @apiGroup Discovery
   * @apiDescription Returns x402 v2 resource and payment metadata (Base USDC, `exact` scheme) — same payload as `/.well-known/x402.json`.
   */
  x402Manifest (req, res) {
    if (this.respondNotFoundWhenDisabled(res)) return

    const apiPrefix = this.apiPrefix || '/v6'
    try {
      const payload = this.getX402WellKnownManifest(apiPrefix)
      return res.status(200).json(payload)
    } catch (err) {
      wlogger.error('x402 well-known manifest error:', err)
      return res.status(500).json({
        error: 'x402 configuration error',
        message: err instanceof Error ? err.message : String(err)
      })
    }
  }

  /**
   * @api {get} /openapi.json OpenAPI discovery document
   * @apiName OpenApiDiscovery
   * @apiGroup Discovery
   * @apiDescription Returns an OpenAPI document generated from apiDoc annotations.
   */
  openapi (req, res) {
    if (this.respondNotFoundWhenDisabled(res)) return

    const docs = this.getDiscoveryDocuments()
    return res.status(200).json(docs.openapi)
  }

  /**
   * @api {get} /swagger.json Swagger discovery document
   * @apiName SwaggerDiscovery
   * @apiGroup Discovery
   * @apiDescription Returns a Swagger 2.0 compatibility document generated from apiDoc annotations.
   */
  swagger (req, res) {
    if (this.respondNotFoundWhenDisabled(res)) return

    const docs = this.getDiscoveryDocuments()
    return res.status(200).json(docs.swagger)
  }

  /**
   * @api {get} /llms.txt LLM discovery file
   * @apiName LlmsDiscovery
   * @apiGroup Discovery
   * @apiDescription Returns an llms.txt markdown index for AI tooling discovery.
   */
  llmsTxt (req, res) {
    if (this.respondNotFoundWhenDisabled(res)) return

    const docs = this.getDiscoveryDocuments()
    return this.sendText(res, docs.llms)
  }

  /**
   * @api {get} /.well-known/agent.json Agent manifest
   * @apiName AgentManifestDiscovery
   * @apiGroup Discovery
   * @apiDescription Returns a draft agent manifest describing API capabilities.
   */
  agentManifest (req, res) {
    if (this.respondNotFoundWhenDisabled(res)) return

    const docs = this.getDiscoveryDocuments()
    return res.status(200).json(docs.agent)
  }

  sendText (res, text) {
    res.status(200)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')

    if (typeof res.send === 'function') {
      return res.send(text)
    }

    if (typeof res.write === 'function') {
      res.write(text)
    }
    if (typeof res.end === 'function') {
      res.end()
    }
    return res
  }
}

export default DiscoveryController
