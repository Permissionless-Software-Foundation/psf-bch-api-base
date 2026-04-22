import { assert } from 'chai'
import { createFacilitatorClient } from '../../../../src/lib/x402/facilitator-client-factory.js'
import { RoundRobinFacilitatorClient } from '../../../../src/lib/x402/round-robin-facilitator-client.js'

class FakeFacilitatorClient {
  constructor (opts) {
    this.opts = opts
  }
}

describe('#facilitator-client-factory', () => {
  it('returns single strategy when only one facilitator is configured', () => {
    const connectionOpts = [
      { key: 'cdp', name: 'Coinbase CDP', url: 'https://cdp.example.com', requiresAuth: true }
    ]

    const result = createFacilitatorClient(connectionOpts, async () => ({}), FakeFacilitatorClient)

    assert.equal(result.strategy, 'single')
    assert.instanceOf(result.client, FakeFacilitatorClient)
    assert.equal(result.client.opts.url, 'https://cdp.example.com')
  })

  it('returns round-robin strategy when multiple facilitators are configured', () => {
    const connectionOpts = [
      { key: 'cdp', name: 'Coinbase CDP', url: 'https://cdp.example.com', requiresAuth: true },
      { key: 'dexter', name: 'Dexter', url: 'https://dexter.example.com', requiresAuth: false }
    ]

    const result = createFacilitatorClient(connectionOpts, async () => ({}), FakeFacilitatorClient)

    assert.equal(result.strategy, 'round-robin-failover')
    assert.instanceOf(result.client, RoundRobinFacilitatorClient)
    assert.lengthOf(result.client.entries, 2)
    assert.equal(result.client.entries[0].key, 'cdp')
    assert.equal(result.client.entries[1].key, 'dexter')
  })
})
