/*
  Unit tests for ReqRESTControllerLib.
*/

// npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Mocking data libraries
import { mockEventsArray } from '../mocks/nostr-relay-mocks.js'
import {
  createMockRequestWithParams,
  createMockResponse
} from '../mocks/controller-mocks.js'

// Unit under test
import ReqRESTControllerLib from '../../../src/controllers/rest-api/req/controller.js'

describe('#req-controller.js', () => {
  let sandbox
  let mockUseCases
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    // Create mock use cases
    mockUseCases = {
      queryEvents: {
        execute: sandbox.stub()
      },
      manageSubscription: {
        createSubscription: sandbox.stub(),
        closeSubscription: sandbox.stub()
      }
    }

    uut = new ReqRESTControllerLib({
      adapters: {},
      useCases: mockUseCases
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#queryEvents()', () => {
    it('should successfully query events with filters as JSON string', async () => {
      const filters = [{ kinds: [1], limit: 10 }]
      const filtersJson = JSON.stringify(filters)
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      req.query = { filters: filtersJson }
      const res = createMockResponse()

      mockUseCases.queryEvents.execute.resolves(mockEventsArray)

      await uut.queryEvents(req, res)

      // Assert use case was called with parsed filters
      assert.isTrue(mockUseCases.queryEvents.execute.calledOnce)
      const executeArgs = mockUseCases.queryEvents.execute.getCall(0).args
      assert.deepEqual(executeArgs[0], filters)
      assert.equal(executeArgs[1], 'test-sub-123')

      // Assert response
      assert.equal(res.statusValue, 200)
      assert.isArray(res.jsonData)
      assert.equal(res.jsonData.length, mockEventsArray.length)
    })

    it('should successfully query events with individual query params', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      req.query = {
        kinds: JSON.stringify([1]),
        authors: JSON.stringify(['abc123']),
        limit: '10'
      }
      const res = createMockResponse()

      mockUseCases.queryEvents.execute.resolves(mockEventsArray)

      await uut.queryEvents(req, res)

      // Assert use case was called
      assert.isTrue(mockUseCases.queryEvents.execute.calledOnce)
      const executeArgs = mockUseCases.queryEvents.execute.getCall(0).args
      assert.isArray(executeArgs[0])
      assert.equal(executeArgs[0][0].kinds[0], 1)
      assert.equal(executeArgs[0][0].authors[0], 'abc123')
      assert.equal(executeArgs[0][0].limit, 10)
    })

    it('should handle empty filters', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      req.query = {}
      const res = createMockResponse()

      mockUseCases.queryEvents.execute.resolves([])

      await uut.queryEvents(req, res)

      // Assert use case was called with empty filters array
      assert.isTrue(mockUseCases.queryEvents.execute.calledOnce)
      const executeArgs = mockUseCases.queryEvents.execute.getCall(0).args
      assert.deepEqual(executeArgs[0], [{}])
    })

    it('should return 400 when subscription ID is missing', async () => {
      const req = createMockRequestWithParams({})
      const res = createMockResponse()

      await uut.queryEvents(req, res)

      // Assert use case was not called
      assert.isFalse(mockUseCases.queryEvents.execute.called)

      // Assert error response
      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'Subscription ID is required')
    })

    it('should return 400 when filters JSON is invalid', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      req.query = { filters: 'invalid-json{' }
      const res = createMockResponse()

      await uut.queryEvents(req, res)

      // Assert error response
      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'Invalid filters JSON')
    })

    it('should handle use case errors', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      req.query = { filters: JSON.stringify([{ kinds: [1] }]) }
      const res = createMockResponse()

      mockUseCases.queryEvents.execute.rejects(new Error('Query failed'))

      await uut.queryEvents(req, res)

      // Assert error response
      assert.equal(res.statusValue, 500)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'Query failed')
    })
  })

  describe('#createSubscription()', () => {
    it('should successfully create SSE subscription', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      req.body = { kinds: [1] }
      const res = createMockResponse()

      mockUseCases.manageSubscription.createSubscription.resolves()

      await uut.createSubscription(req, res)

      // Assert use case was called
      assert.isTrue(mockUseCases.manageSubscription.createSubscription.calledOnce)
      const createArgs = mockUseCases.manageSubscription.createSubscription.getCall(0).args
      assert.equal(createArgs[0], 'test-sub-123')
      assert.isArray(createArgs[1])
      assert.equal(createArgs[1][0].kinds[0], 1)
      assert.isFunction(createArgs[2]) // onEvent
      assert.isFunction(createArgs[3]) // onEose
      assert.isFunction(createArgs[4]) // onClosed

      // Assert SSE headers
      assert.equal(res.headers['Content-Type'], 'text/event-stream')
      assert.equal(res.headers['Cache-Control'], 'no-cache')
      assert.equal(res.headers.Connection, 'keep-alive')

      // Assert initial connection message was written
      assert.isTrue(res.writeData.length > 0)
    })

    it('should return 400 when subscription ID is missing', async () => {
      const req = createMockRequestWithParams({})
      req.body = { kinds: [1] }
      const res = createMockResponse()

      await uut.createSubscription(req, res)

      // Assert error response
      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'Subscription ID is required')
    })

    it('should return 400 when filters are missing', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      req.body = {}
      const res = createMockResponse()

      await uut.createSubscription(req, res)

      // Assert error response
      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'Filters are required')
    })

    it('should handle filters as array', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      req.body = [{ kinds: [1] }, { kinds: [3] }]
      const res = createMockResponse()

      mockUseCases.manageSubscription.createSubscription.resolves()

      await uut.createSubscription(req, res)

      // Assert filters array was passed correctly
      const createArgs = mockUseCases.manageSubscription.createSubscription.getCall(0).args
      assert.isArray(createArgs[1])
      assert.equal(createArgs[1].length, 2)
    })

    it('should handle client disconnect', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      req.body = { kinds: [1] }
      req.on = sinon.stub()
      const res = createMockResponse()

      mockUseCases.manageSubscription.createSubscription.resolves()
      mockUseCases.manageSubscription.closeSubscription.resolves()

      await uut.createSubscription(req, res)

      // Assert close handler was set up
      assert.isTrue(req.on.calledWith('close'))

      // Simulate client disconnect
      const closeCallback = req.on.getCall(0).args[1]
      await closeCallback()

      // Assert closeSubscription was called
      assert.isTrue(mockUseCases.manageSubscription.closeSubscription.calledOnce)
      assert.equal(mockUseCases.manageSubscription.closeSubscription.getCall(0).args[0], 'test-sub-123')
    })
  })

  describe('#closeSubscription()', () => {
    it('should successfully close a subscription', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      const res = createMockResponse()

      mockUseCases.manageSubscription.closeSubscription.resolves()

      await uut.closeSubscription(req, res)

      // Assert use case was called
      assert.isTrue(mockUseCases.manageSubscription.closeSubscription.calledOnce)
      assert.equal(mockUseCases.manageSubscription.closeSubscription.getCall(0).args[0], 'test-sub-123')

      // Assert response
      assert.equal(res.statusValue, 200)
      assert.property(res.jsonData, 'message')
      assert.include(res.jsonData.message, 'closed successfully')
    })

    it('should return 400 when subscription ID is missing', async () => {
      const req = createMockRequestWithParams({})
      const res = createMockResponse()

      await uut.closeSubscription(req, res)

      // Assert error response
      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'Subscription ID is required')
    })

    it('should handle use case errors', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      const res = createMockResponse()

      mockUseCases.manageSubscription.closeSubscription.rejects(new Error('Relay connection error'))

      await uut.closeSubscription(req, res)

      // Assert error response
      assert.equal(res.statusValue, 500)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'Relay connection error')
    })

    it('should handle idempotent close (subscription already closed)', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      const res = createMockResponse()

      // closeSubscription resolves successfully even if subscription doesn't exist
      mockUseCases.manageSubscription.closeSubscription.resolves()

      await uut.closeSubscription(req, res)

      // Assert success response even for already-closed subscription
      assert.equal(res.statusValue, 200)
      assert.property(res.jsonData, 'message')
      assert.include(res.jsonData.message, 'closed successfully')
    })
  })

  describe('#createSubscriptionPut()', () => {
    it('should call createSubscription', async () => {
      const req = createMockRequestWithParams({ subId: 'test-sub-123' })
      req.body = { kinds: [1] }
      const res = createMockResponse()

      mockUseCases.manageSubscription.createSubscription.resolves()

      await uut.createSubscriptionPut(req, res)

      // Assert createSubscription was called
      assert.isTrue(mockUseCases.manageSubscription.createSubscription.calledOnce)
    })
  })

  describe('#constructor()', () => {
    it('should require adapters instance', () => {
      try {
        // eslint-disable-next-line no-new
        new ReqRESTControllerLib({ useCases: mockUseCases })
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'Adapters library required')
      }
    })

    it('should require useCases instance', () => {
      try {
        // eslint-disable-next-line no-new
        new ReqRESTControllerLib({ adapters: {} })
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'Use Cases library required')
      }
    })
  })
})
