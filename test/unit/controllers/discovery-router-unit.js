/*
  Unit tests for DiscoveryRouter.
*/

import { assert } from 'chai'

import DiscoveryRouter from '../../../src/controllers/discovery/router.js'

describe('#discovery-router.js', () => {
  it('should require app object in attach()', () => {
    const uut = new DiscoveryRouter()
    assert.throws(() => uut.attach(), /Must pass app object/)
  })

  it('should register all discovery routes', () => {
    const calls = []
    const app = {
      use: () => {}
    }

    const mockRouter = {
      get: (path, handler) => calls.push({ path, handler })
    }

    const mockController = {
      x402Manifest: () => {},
      openapi: () => {},
      swagger: () => {},
      llmsTxt: () => {},
      agentManifest: () => {}
    }

    const uut = new DiscoveryRouter({ controller: mockController })
    uut.router = mockRouter
    uut.attach(app)

    assert.equal(calls.length, 5)
    assert.deepEqual(
      calls.map(x => x.path),
      ['/.well-known/x402', '/openapi.json', '/swagger.json', '/llms.txt', '/.well-known/agent.json']
    )
  })
})
