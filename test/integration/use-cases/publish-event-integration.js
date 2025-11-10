/*
  Integration tests for PublishEventUseCase with real adapter.
  These tests require a running Nostr relay.
*/

// npm libraries
import { assert } from 'chai'

// Unit under test
import Adapters from '../../../src/adapters/index.js'
import PublishEventUseCase from '../../../src/use-cases/publish-event.js'
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure'

describe('#publish-event-integration.js', () => {
  let adapters
  let uut

  before(async () => {
    // Initialize adapters (will connect to real relay)
    adapters = new Adapters()
    await adapters.start()

    uut = new PublishEventUseCase({ adapters })
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
    it('should successfully publish a valid event', async () => {
      // Generate keys
      const sk = generateSecretKey()

      // Create event template
      const eventTemplate = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Integration test post from use case'
      }

      // Sign the event
      const signedEvent = finalizeEvent(eventTemplate, sk)

      // Execute use case
      const result = await uut.execute(signedEvent)

      // Assert result
      assert.property(result, 'accepted')
      assert.property(result, 'message')
      assert.property(result, 'eventId')
      assert.equal(result.eventId, signedEvent.id)
    })

    it('should reject invalid event structure', async () => {
      const invalidEvent = {
        id: 'invalid',
        pubkey: 'invalid',
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [],
        content: 'Test',
        sig: 'invalid'
      }

      try {
        await uut.execute(invalidEvent)
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'Invalid event structure')
      }
    })

    it('should handle relay rejection', async () => {
      // Generate keys
      const sk = generateSecretKey()

      // Create a duplicate event (if we send same event twice)
      const eventTemplate = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Duplicate test post'
      }

      const signedEvent = finalizeEvent(eventTemplate, sk)

      // Publish first time
      const result1 = await uut.execute(signedEvent)
      assert.property(result1, 'accepted')

      // Try to publish again (may be rejected as duplicate)
      const result2 = await uut.execute(signedEvent)
      assert.property(result2, 'accepted')
      // Result may be accepted or rejected depending on relay
    })
  })
})
