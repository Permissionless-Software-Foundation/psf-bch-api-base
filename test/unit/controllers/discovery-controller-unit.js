/*
  Unit tests for DiscoveryController.
*/

import { assert } from 'chai'

import DiscoveryController from '../../../src/controllers/discovery/controller.js'
import { createMockRequest, createMockResponse } from '../mocks/controller-mocks.js'

describe('#discovery-controller.js', () => {
  const makeController = ({ enabled = true } = {}) => {
    return new DiscoveryController({
      apiPrefix: '/v6',
      getX402Settings: () => ({
        enabled,
        facilitatorUrl: 'http://localhost:4345/facilitator',
        serverAddress: '0x0000000000000000000000000000000000000001',
        priceUSDC: '0.1',
        network: 'eip155:8453'
      }),
      getX402WellKnownManifest: () => ({
        x402Version: 2,
        network: 'eip155:8453',
        facilitator: { url: 'http://localhost:4345/facilitator' },
        resources: [
          {
            resource: '/v6/*',
            type: 'http',
            x402Version: 2,
            accepts: [
              {
                scheme: 'exact',
                network: 'eip155:8453',
                price: '0.1',
                payTo: '0x0000000000000000000000000000000000000001',
                description: 'test',
                mimeType: 'application/json',
                maxTimeoutSeconds: 120,
                extra: {}
              }
            ]
          }
        ]
      }),
      getDiscoveryDocuments: () => ({
        openapi: { openapi: '3.0.3', paths: { '/v6/price/bchusd': {} } },
        swagger: { swagger: '2.0', paths: { '/v6/price/bchusd': {} } },
        llms: '# psf-bch-api',
        agent: { awp_version: '0.1', actions: [] }
      })
    })
  }

  describe('x402 disabled gating', () => {
    it('should return 404 for all discovery endpoints when x402 disabled', async () => {
      const uut = makeController({ enabled: false })
      const req = createMockRequest()

      const handlers = [
        uut.x402Manifest,
        uut.openapi,
        uut.swagger,
        uut.llmsTxt,
        uut.agentManifest
      ]

      for (const handler of handlers) {
        const res = createMockResponse()
        await handler(req, res)
        assert.equal(res.statusValue, 404)
        assert.deepEqual(res.jsonData, { error: 'Not found' })
      }
    })
  })

  describe('x402 enabled responses', () => {
    it('should return x402 manifest schema fields', async () => {
      const uut = makeController({ enabled: true })
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.x402Manifest(req, res)

      assert.equal(res.statusValue, 200)
      assert.equal(res.jsonData.x402Version, 2)
      assert.isArray(res.jsonData.resources)
      assert.equal(res.jsonData.resources[0].accepts[0].scheme, 'exact')
      assert.equal(res.jsonData.resources[0].accepts[0].price, '0.1')
    })

    it('should return openapi and swagger docs', async () => {
      const uut = makeController({ enabled: true })
      const req = createMockRequest()

      const openapiRes = createMockResponse()
      await uut.openapi(req, openapiRes)
      assert.equal(openapiRes.statusValue, 200)
      assert.equal(openapiRes.jsonData.openapi, '3.0.3')

      const swaggerRes = createMockResponse()
      await uut.swagger(req, swaggerRes)
      assert.equal(swaggerRes.statusValue, 200)
      assert.equal(swaggerRes.jsonData.swagger, '2.0')
    })

    it('should return llms.txt as text/plain', async () => {
      const uut = makeController({ enabled: true })
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.llmsTxt(req, res)

      assert.equal(res.statusValue, 200)
      assert.equal(res.headers['Content-Type'], 'text/plain; charset=utf-8')
      assert.equal(res.writeData[0], '# psf-bch-api')
      assert.isTrue(res.endCalled)
    })

    it('should return agent manifest json', async () => {
      const uut = makeController({ enabled: true })
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.agentManifest(req, res)

      assert.equal(res.statusValue, 200)
      assert.equal(res.jsonData.awp_version, '0.1')
      assert.isArray(res.jsonData.actions)
    })
  })
})
