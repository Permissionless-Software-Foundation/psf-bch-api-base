/*
  Unit tests for ManageSubscriptionUseCase.
*/

// npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Mocking data libraries
import { mockKind1Event } from '../mocks/event-mocks.js'

// Unit under test
import ManageSubscriptionUseCase from '../../../src/use-cases/manage-subscription.js'

describe('#manage-subscription.js', () => {
  let sandbox
  let mockAdapters
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    // Create mock adapters with multiple relays support
    const mockRelay1 = {
      relayUrl: 'wss://relay1.example.com',
      sendReq: sandbox.stub(),
      sendClose: sandbox.stub()
    }
    const mockRelay2 = {
      relayUrl: 'wss://relay2.example.com',
      sendReq: sandbox.stub(),
      sendClose: sandbox.stub()
    }

    mockAdapters = {
      nostrRelays: [mockRelay1, mockRelay2]
    }

    uut = new ManageSubscriptionUseCase({ adapters: mockAdapters })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#createSubscription()', () => {
    it('should successfully create a subscription across all relays', async () => {
      const subscriptionId = 'test-sub-123'
      const filters = [{ kinds: [1] }]
      let onEventCalled = false
      let onEoseCalled = false
      let onClosedCalled = false

      const onEvent = (event) => {
        onEventCalled = true
      }
      const onEose = () => {
        onEoseCalled = true
      }
      const onClosed = (message) => {
        onClosedCalled = true
      }

      // Mock adapters to resolve
      mockAdapters.nostrRelays[0].sendReq.resolves()
      mockAdapters.nostrRelays[1].sendReq.resolves()

      await uut.createSubscription(subscriptionId, filters, onEvent, onEose, onClosed)

      // Assert adapters were called for both relays
      assert.isTrue(mockAdapters.nostrRelays[0].sendReq.calledOnce)
      assert.isTrue(mockAdapters.nostrRelays[1].sendReq.calledOnce)

      // Assert subscription is tracked
      assert.isTrue(uut.hasSubscription(subscriptionId))

      // Test handlers - get them from the subscription info
      const subscriptionInfo = uut.activeSubscriptions.get(subscriptionId)
      const handlers = subscriptionInfo.handlers

      // Test event handler (should de-duplicate)
      handlers.onEvent(mockKind1Event)
      assert.isTrue(onEventCalled)

      // Simulate EOSE from both relays
      const relayStatuses = subscriptionInfo.relayStatuses
      relayStatuses[0].eoseReceived = true
      relayStatuses[1].eoseReceived = true
      handlers.onEose()
      assert.isTrue(onEoseCalled)

      handlers.onClosed('test message')
      assert.isTrue(onClosedCalled)
      assert.isFalse(uut.hasSubscription(subscriptionId))
    })

    it('should prevent duplicate subscriptions', async () => {
      const subscriptionId = 'test-sub-123'
      const filters = [{ kinds: [1] }]

      mockAdapters.nostrRelays[0].sendReq.resolves()
      mockAdapters.nostrRelays[1].sendReq.resolves()

      await uut.createSubscription(subscriptionId, filters)

      try {
        await uut.createSubscription(subscriptionId, filters)
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'already exists')
      }
    })

    it('should clean up subscription on error', async () => {
      const subscriptionId = 'test-sub-123'
      const filters = [{ kinds: [1] }]

      mockAdapters.nostrRelays[0].sendReq.rejects(new Error('Connection error'))
      mockAdapters.nostrRelays[1].sendReq.resolves()

      try {
        await uut.createSubscription(subscriptionId, filters)
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        // Should clean up even if some relays fail
        assert.isFalse(uut.hasSubscription(subscriptionId))
      }
    })

    it('should handle missing callbacks gracefully', async () => {
      const subscriptionId = 'test-sub-123'
      const filters = [{ kinds: [1] }]

      mockAdapters.nostrRelays[0].sendReq.resolves()
      mockAdapters.nostrRelays[1].sendReq.resolves()

      await uut.createSubscription(subscriptionId, filters, null, null, null)

      // Should not throw when handlers are null
      const subscriptionInfo = uut.activeSubscriptions.get(subscriptionId)
      const handlers = subscriptionInfo.handlers
      handlers.onEvent(mockKind1Event)
      handlers.onEose()
      handlers.onClosed('test')
    })
  })

  describe('#closeSubscription()', () => {
    it('should successfully close a subscription across all relays', async () => {
      const subscriptionId = 'test-sub-123'
      const filters = [{ kinds: [1] }]

      mockAdapters.nostrRelays[0].sendReq.resolves()
      mockAdapters.nostrRelays[1].sendReq.resolves()
      mockAdapters.nostrRelays[0].sendClose.resolves()
      mockAdapters.nostrRelays[1].sendClose.resolves()

      // Create subscription first
      await uut.createSubscription(subscriptionId, filters)
      assert.isTrue(uut.hasSubscription(subscriptionId))

      // Close subscription
      await uut.closeSubscription(subscriptionId)

      // Assert adapters were called for both relays
      assert.isTrue(mockAdapters.nostrRelays[0].sendClose.calledOnce)
      assert.isTrue(mockAdapters.nostrRelays[1].sendClose.calledOnce)

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

    it('should clean up subscription even on error', async () => {
      const subscriptionId = 'test-sub-123'
      const filters = [{ kinds: [1] }]

      mockAdapters.nostrRelays[0].sendReq.resolves()
      mockAdapters.nostrRelays[1].sendReq.resolves()
      mockAdapters.nostrRelays[0].sendClose.rejects(new Error('Close error'))
      mockAdapters.nostrRelays[1].sendClose.resolves()

      // Create subscription first
      await uut.createSubscription(subscriptionId, filters)

      // Close should succeed even if one relay fails
      await uut.closeSubscription(subscriptionId)

      // Should still clean up
      assert.isFalse(uut.hasSubscription(subscriptionId))
    })
  })

  describe('#hasSubscription()', () => {
    it('should return false for non-existent subscription', () => {
      assert.isFalse(uut.hasSubscription('non-existent'))
    })

    it('should return true for existing subscription', async () => {
      const subscriptionId = 'test-sub-123'
      const filters = [{ kinds: [1] }]

      mockAdapters.nostrRelays[0].sendReq.resolves()
      mockAdapters.nostrRelays[1].sendReq.resolves()

      assert.isFalse(uut.hasSubscription(subscriptionId))
      await uut.createSubscription(subscriptionId, filters)
      assert.isTrue(uut.hasSubscription(subscriptionId))
    })
  })

  describe('#constructor()', () => {
    it('should require adapters instance', () => {
      try {
        // eslint-disable-next-line no-new
        new ManageSubscriptionUseCase()
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'Adapters instance required')
      }
    })

    it('should require NostrRelay adapters array', () => {
      try {
        // eslint-disable-next-line no-new
        new ManageSubscriptionUseCase({ adapters: {} })
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'NostrRelay adapters array required')
      }
    })
  })
})
