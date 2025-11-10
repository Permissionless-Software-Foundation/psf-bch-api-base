/*
  Integration tests for ManageSubscriptionUseCase with real adapter.
  These tests require a running Nostr relay.
*/

// npm libraries
import { assert } from 'chai'

// Unit under test
import Adapters from '../../../src/adapters/index.js'
import ManageSubscriptionUseCase from '../../../src/use-cases/manage-subscription.js'

describe('#manage-subscription-integration.js', () => {
  let adapters
  let uut

  before(async () => {
    // Initialize adapters (will connect to real relay)
    adapters = new Adapters()
    await adapters.start()

    uut = new ManageSubscriptionUseCase({ adapters })
  })

  after(async () => {
    // Clean up all subscriptions and disconnect from all relays
    // Note: This is a simplified cleanup - in production you'd track all subscriptions
    if (adapters && adapters.nostrRelays) {
      await Promise.allSettled(
        adapters.nostrRelays.map(relay => relay.disconnect())
      )
    }
  })

  describe('#createSubscription()', () => {
    it('should successfully create a subscription', async () => {
      const subscriptionId = 'test-sub-' + Date.now()
      const filters = [{ kinds: [1], limit: 5 }]

      let eventReceived = false
      let eoseReceived = false

      const onEvent = (event) => {
        eventReceived = true
        assert.property(event, 'id')
        assert.property(event, 'kind')
      }

      const onEose = () => {
        eoseReceived = true
      }

      const onClosed = () => {
        // Handler for closed events
      }

      await uut.createSubscription(subscriptionId, filters, onEvent, onEose, onClosed)

      // Assert subscription exists
      assert.isTrue(uut.hasSubscription(subscriptionId))

      // Wait a bit for events/EOSE
      await new Promise(resolve => setTimeout(resolve, 2000))

      // EOSE should be received (or events)
      // Note: May not receive events if none exist, but EOSE should come
      assert.isTrue(eoseReceived || eventReceived)

      // Clean up
      if (uut.hasSubscription(subscriptionId)) {
        await uut.closeSubscription(subscriptionId)
      }
    })

    it('should prevent duplicate subscriptions', async () => {
      const subscriptionId = 'test-dup-' + Date.now()
      const filters = [{ kinds: [1] }]

      await uut.createSubscription(subscriptionId, filters)

      try {
        await uut.createSubscription(subscriptionId, filters)
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'already exists')
      }

      // Clean up
      if (uut.hasSubscription(subscriptionId)) {
        await uut.closeSubscription(subscriptionId)
      }
    })

    it('should handle subscription with no events', async () => {
      const subscriptionId = 'test-empty-' + Date.now()
      const filters = [{ kinds: [99999], limit: 1 }] // Unlikely to have events

      let eoseReceived = false

      const onEose = () => {
        eoseReceived = true
      }

      await uut.createSubscription(subscriptionId, filters, null, onEose, null)

      // Wait for EOSE
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Should receive EOSE even with no events
      assert.isTrue(eoseReceived)

      // Clean up
      if (uut.hasSubscription(subscriptionId)) {
        await uut.closeSubscription(subscriptionId)
      }
    })
  })

  describe('#closeSubscription()', () => {
    it('should successfully close a subscription', async () => {
      const subscriptionId = 'test-close-' + Date.now()
      const filters = [{ kinds: [1] }]

      await uut.createSubscription(subscriptionId, filters)
      assert.isTrue(uut.hasSubscription(subscriptionId))

      await uut.closeSubscription(subscriptionId)

      // Assert subscription is removed
      assert.isFalse(uut.hasSubscription(subscriptionId))
    })

    it('should return successfully when closing non-existent subscription (idempotent)', async () => {
      const subscriptionId = 'non-existent-sub'

      // Should not throw - idempotent operation
      await uut.closeSubscription(subscriptionId)

      // Should return successfully without error
      assert.isTrue(true, 'closeSubscription should succeed for non-existent subscription')
    })
  })

  describe('#hasSubscription()', () => {
    it('should return false for non-existent subscription', () => {
      assert.isFalse(uut.hasSubscription('non-existent'))
    })

    it('should return true for existing subscription', async () => {
      const subscriptionId = 'test-has-' + Date.now()
      const filters = [{ kinds: [1] }]

      assert.isFalse(uut.hasSubscription(subscriptionId))
      await uut.createSubscription(subscriptionId, filters)
      assert.isTrue(uut.hasSubscription(subscriptionId))

      // Clean up
      if (uut.hasSubscription(subscriptionId)) {
        await uut.closeSubscription(subscriptionId)
      }
    })
  })
})
