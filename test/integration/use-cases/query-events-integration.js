/*
  Integration tests for QueryEventsUseCase with real adapter.
  These tests require a running Nostr relay.
*/

// npm libraries
import { assert } from 'chai'

// Unit under test
import Adapters from '../../../src/adapters/index.js'
import QueryEventsUseCase from '../../../src/use-cases/query-events.js'

describe('#query-events-integration.js', () => {
  let adapters
  let uut

  before(async () => {
    // Initialize adapters (will connect to real relay)
    adapters = new Adapters()
    await adapters.start()

    uut = new QueryEventsUseCase({ adapters })
  })

  after(async () => {
    // Clean up adapters - disconnect from all relays
    if (adapters && adapters.nostrRelays) {
      await Promise.allSettled(
        adapters.nostrRelays.map(relay => relay.disconnect())
      )
    }
  })

  describe('#execute()', () => {
    it('should successfully query events', async () => {
      const filters = [{ kinds: [1], limit: 5 }]
      const subscriptionId = 'test-query-' + Date.now()

      const events = await uut.execute(filters, subscriptionId)

      // Assert result is an array
      assert.isArray(events)

      // If events are returned, verify structure
      if (events.length > 0) {
        assert.property(events[0], 'id')
        assert.property(events[0], 'pubkey')
        assert.property(events[0], 'created_at')
        assert.property(events[0], 'kind')
        assert.property(events[0], 'content')
        assert.equal(events[0].kind, 1)
      }
    })

    it('should handle empty results', async () => {
      // Query for events that likely don't exist
      const filters = [{ kinds: [99999], limit: 1 }]
      const subscriptionId = 'test-empty-' + Date.now()

      const events = await uut.execute(filters, subscriptionId)

      // Should return empty array, not throw
      assert.isArray(events)
      assert.equal(events.length, 0)
    })

    it('should handle multiple filters', async function () {
      // Increase timeout for this test - needs to be longer than use case timeout (30s)
      this.timeout(35000)

      const filters = [
        { kinds: [1], limit: 2 },
        { kinds: [3], limit: 2 }
      ]
      const subscriptionId = 'test-multi-' + Date.now()

      const events = await uut.execute(filters, subscriptionId)

      // Should return array (may be empty)
      assert.isArray(events)
    })

    it('should timeout if EOSE not received', async () => {
      // This test may take up to 30 seconds
      // Use a filter that might not return EOSE quickly
      const filters = [{ kinds: [1] }] // No limit, might timeout
      const subscriptionId = 'test-timeout-' + Date.now()

      // Should eventually return (even if empty)
      const events = await uut.execute(filters, subscriptionId)

      assert.isArray(events)
    })
  })
})
