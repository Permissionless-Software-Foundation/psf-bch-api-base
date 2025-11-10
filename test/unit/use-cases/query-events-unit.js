/*
  Unit tests for QueryEventsUseCase.
*/

// npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Mocking data libraries
import { mockEventsArray } from '../mocks/nostr-relay-mocks.js'

// Unit under test
import QueryEventsUseCase from '../../../src/use-cases/query-events.js'

describe('#query-events.js', () => {
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
      queryAllRelays: sandbox.stub()
    }

    uut = new QueryEventsUseCase({ adapters: mockAdapters })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#execute()', () => {
    it('should successfully query events from all relays and return merged results', async () => {
      const filters = [{ kinds: [1], limit: 10 }]
      const subscriptionId = 'test-sub-123'

      // Mock queryAllRelays to return events
      mockAdapters.queryAllRelays.resolves(mockEventsArray)

      const result = await uut.execute(filters, subscriptionId)

      // Assert adapter was called correctly
      assert.isTrue(mockAdapters.queryAllRelays.calledOnce)
      const callArgs = mockAdapters.queryAllRelays.getCall(0).args
      assert.deepEqual(callArgs[0], filters)
      assert.equal(callArgs[1], subscriptionId)

      // Assert result contains events
      assert.isArray(result)
      assert.equal(result.length, mockEventsArray.length)
    })

    it('should handle errors from queryAllRelays', async () => {
      const filters = [{ kinds: [1] }]
      const subscriptionId = 'test-sub-123'

      mockAdapters.queryAllRelays.rejects(new Error('Query failed'))

      try {
        await uut.execute(filters, subscriptionId)
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'Query failed')
      }
    })

    it('should return empty array when no events found', async () => {
      const filters = [{ kinds: [1] }]
      const subscriptionId = 'test-sub-123'

      mockAdapters.queryAllRelays.resolves([])

      const result = await uut.execute(filters, subscriptionId)

      assert.isArray(result)
      assert.equal(result.length, 0)
    })

    it('should require adapters instance', () => {
      try {
        // eslint-disable-next-line no-new
        new QueryEventsUseCase()
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'Adapters instance required')
      }
    })

    it('should require NostrRelay adapters array', () => {
      try {
        // eslint-disable-next-line no-new
        new QueryEventsUseCase({ adapters: {} })
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'NostrRelay adapters array required')
      }
    })
  })
})
