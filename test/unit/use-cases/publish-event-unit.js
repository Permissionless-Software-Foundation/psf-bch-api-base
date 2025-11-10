/*
  Unit tests for PublishEventUseCase.
*/

// npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Mocking data libraries
import {
  mockKind1Event,
  mockInvalidEventMissingId
} from '../mocks/event-mocks.js'

// Unit under test
import PublishEventUseCase from '../../../src/use-cases/publish-event.js'

describe('#publish-event.js', () => {
  let sandbox
  let mockAdapters
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    // Create mock adapters with multiple relays support
    mockAdapters = {
      nostrRelays: [
        { relayUrl: 'wss://relay1.example.com' },
        { relayUrl: 'wss://relay2.example.com' }
      ],
      broadcastEvent: sandbox.stub()
    }

    uut = new PublishEventUseCase({ adapters: mockAdapters })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#execute()', () => {
    it('should successfully publish a valid event to all relays', async () => {
      // Mock broadcast response - at least one relay accepts
      mockAdapters.broadcastEvent.resolves([
        { accepted: true, message: 'event saved', relayUrl: 'wss://relay1.example.com', success: true },
        { accepted: true, message: 'event saved', relayUrl: 'wss://relay2.example.com', success: true }
      ])

      const result = await uut.execute(mockKind1Event)

      // Assert adapter was called correctly
      assert.isTrue(mockAdapters.broadcastEvent.calledOnce)
      const callArgs = mockAdapters.broadcastEvent.getCall(0).args[0]
      assert.equal(callArgs.id, mockKind1Event.id)
      assert.equal(callArgs.kind, mockKind1Event.kind)

      // Assert result
      assert.property(result, 'accepted')
      assert.property(result, 'message')
      assert.property(result, 'eventId')
      assert.property(result, 'relayResults')
      assert.property(result, 'acceptedCount')
      assert.property(result, 'totalRelays')
      assert.isTrue(result.accepted)
      assert.equal(result.eventId, mockKind1Event.id)
      assert.equal(result.acceptedCount, 2)
      assert.equal(result.totalRelays, 2)
    })

    it('should handle event rejection from all relays', async () => {
      // Mock broadcast response - all relays reject
      mockAdapters.broadcastEvent.resolves([
        { accepted: false, message: 'duplicate', relayUrl: 'wss://relay1.example.com', success: true },
        { accepted: false, message: 'duplicate', relayUrl: 'wss://relay2.example.com', success: true }
      ])

      const result = await uut.execute(mockKind1Event)

      // Assert result shows rejection
      assert.isFalse(result.accepted)
      assert.property(result, 'message')
      assert.equal(result.eventId, mockKind1Event.id)
      assert.equal(result.acceptedCount, 0)
    })

    it('should succeed if at least one relay accepts', async () => {
      // Mock broadcast response - one accepts, one rejects
      mockAdapters.broadcastEvent.resolves([
        { accepted: true, message: 'event saved', relayUrl: 'wss://relay1.example.com', success: true },
        { accepted: false, message: 'duplicate', relayUrl: 'wss://relay2.example.com', success: true }
      ])

      const result = await uut.execute(mockKind1Event)

      // Should succeed if at least one accepts
      assert.isTrue(result.accepted)
      assert.equal(result.acceptedCount, 1)
      assert.equal(result.totalRelays, 2)
    })

    it('should throw error for invalid event structure', async () => {
      try {
        await uut.execute(mockInvalidEventMissingId)
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'Invalid event structure')
        assert.isFalse(mockAdapters.broadcastEvent.called)
      }
    })

    it('should handle adapter errors', async () => {
      // Mock adapter error
      const adapterError = new Error('Network error')
      mockAdapters.broadcastEvent.rejects(adapterError)

      try {
        await uut.execute(mockKind1Event)
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.equal(err.message, 'Network error')
        assert.isTrue(mockAdapters.broadcastEvent.calledOnce)
      }
    })

    it('should require adapters instance', () => {
      try {
        // eslint-disable-next-line no-new
        new PublishEventUseCase()
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'Adapters instance required')
      }
    })

    it('should require NostrRelay adapters array', () => {
      try {
        // eslint-disable-next-line no-new
        new PublishEventUseCase({ adapters: {} })
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'NostrRelay adapters array required')
      }
    })
  })
})
