import { HTTPFacilitatorClient } from '@x402/core/server'
import { RoundRobinFacilitatorClient } from './round-robin-facilitator-client.js'

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
      client: entries[0].client,
      strategy: 'single'
    }
  }

  return {
    client: new RoundRobinFacilitatorClient(entries),
    strategy: 'round-robin-failover'
  }
}
