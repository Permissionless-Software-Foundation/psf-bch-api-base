import { HTTPFacilitatorClient } from '@x402/core/server'
import { RoundRobinFacilitatorClient } from './round-robin-facilitator-client.js'

function withSettleLogging (entry) {
  return {
    async getSupported () {
      return entry.client.getSupported()
    },
    async verify (paymentPayload, paymentRequirements) {
      return entry.client.verify(paymentPayload, paymentRequirements)
    },
    async settle (paymentPayload, paymentRequirements) {
      const result = await entry.client.settle(paymentPayload, paymentRequirements)
      const tx = result?.transaction || 'n/a'
      console.log(`[x402] payment settled via ${entry.name || entry.key || 'facilitator'} (${entry.url || 'no-url'}) tx=${tx}`)
      return result
    }
  }
}

export function createFacilitatorClient (connectionOpts = [], createAuthHeaders, ClientClass = HTTPFacilitatorClient) {
  const entries = connectionOpts.map(o => ({
    key: o.key,
    name: o.name,
    url: o.url,
    client: new ClientClass({
      url: o.url,
      createAuthHeaders: o.requiresAuth ? createAuthHeaders : null
    })
  }))

  if (entries.length === 0) {
    throw new Error('No facilitator connection options found.')
  }

  if (entries.length === 1) {
    return {
      client: withSettleLogging(entries[0]),
      strategy: 'single'
    }
  }

  return {
    client: new RoundRobinFacilitatorClient(entries),
    strategy: 'round-robin-failover'
  }
}
