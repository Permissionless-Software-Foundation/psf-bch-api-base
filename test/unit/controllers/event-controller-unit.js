/*
  Unit tests for EventRESTControllerLib.
*/

// npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Mocking data libraries
import {
  mockKind1Event,
  mockKind0Event
} from '../mocks/event-mocks.js'
import {
  createMockRequestWithBody,
  createMockResponse
} from '../mocks/controller-mocks.js'

// Unit under test
import EventRESTControllerLib from '../../../src/controllers/rest-api/event/controller.js'

describe('#event-controller.js', () => {
  let sandbox
  let mockUseCases
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    // Create mock use cases
    mockUseCases = {
      publishEvent: {
        execute: sandbox.stub()
      }
    }

    uut = new EventRESTControllerLib({
      adapters: {},
      useCases: mockUseCases
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#publishEvent()', () => {
    it('should successfully publish an event', async () => {
      const req = createMockRequestWithBody(mockKind1Event)
      const res = createMockResponse()

      mockUseCases.publishEvent.execute.resolves({
        accepted: true,
        message: 'event saved',
        eventId: mockKind1Event.id
      })

      await uut.publishEvent(req, res)

      // Assert use case was called
      assert.isTrue(mockUseCases.publishEvent.execute.calledOnce)
      assert.deepEqual(mockUseCases.publishEvent.execute.getCall(0).args[0], mockKind1Event)

      // Assert response
      assert.equal(res.statusValue, 200)
      assert.property(res.jsonData, 'accepted')
      assert.isTrue(res.jsonData.accepted)
      assert.equal(res.jsonData.eventId, mockKind1Event.id)
    })

    it('should return 400 when event is rejected', async () => {
      const req = createMockRequestWithBody(mockKind1Event)
      const res = createMockResponse()

      mockUseCases.publishEvent.execute.resolves({
        accepted: false,
        message: 'duplicate: event already exists',
        eventId: mockKind1Event.id
      })

      await uut.publishEvent(req, res)

      // Assert response status is 400
      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'accepted')
      assert.isFalse(res.jsonData.accepted)
    })

    it('should return 400 when event data is missing', async () => {
      const req = createMockRequestWithBody(null)
      const res = createMockResponse()

      await uut.publishEvent(req, res)

      // Assert use case was not called
      assert.isFalse(mockUseCases.publishEvent.execute.called)

      // Assert error response
      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'Event data is required')
    })

    it('should handle use case errors', async () => {
      const req = createMockRequestWithBody(mockKind1Event)
      const res = createMockResponse()

      mockUseCases.publishEvent.execute.rejects(new Error('Network error'))

      await uut.publishEvent(req, res)

      // Assert error response
      assert.equal(res.statusValue, 500)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'Network error')
    })

    it('should return 400 for validation errors', async () => {
      const req = createMockRequestWithBody(mockKind1Event)
      const res = createMockResponse()

      mockUseCases.publishEvent.execute.rejects(new Error('Invalid event structure'))

      await uut.publishEvent(req, res)

      // Assert validation error returns 400
      assert.equal(res.statusValue, 400)
      assert.property(res.jsonData, 'error')
      assert.include(res.jsonData.error, 'Invalid event structure')
    })

    it('should handle errors with missing message', async () => {
      const req = createMockRequestWithBody(mockKind1Event)
      const res = createMockResponse()

      const error = new Error()
      error.message = undefined
      mockUseCases.publishEvent.execute.rejects(error)

      await uut.publishEvent(req, res)

      // Assert error response with default message
      assert.equal(res.statusValue, 500)
      assert.property(res.jsonData, 'error')
      assert.equal(res.jsonData.error, 'Internal server error')
    })

    it('should publish different event kinds', async () => {
      const req = createMockRequestWithBody(mockKind0Event)
      const res = createMockResponse()

      mockUseCases.publishEvent.execute.resolves({
        accepted: true,
        message: 'event saved',
        eventId: mockKind0Event.id
      })

      await uut.publishEvent(req, res)

      assert.isTrue(mockUseCases.publishEvent.execute.calledOnce)
      assert.equal(res.statusValue, 200)
      assert.isTrue(res.jsonData.accepted)
    })
  })

  describe('#constructor()', () => {
    it('should require adapters instance', () => {
      try {
        // eslint-disable-next-line no-new
        new EventRESTControllerLib({ useCases: mockUseCases })
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'Adapters library required')
      }
    })

    it('should require useCases instance', () => {
      try {
        // eslint-disable-next-line no-new
        new EventRESTControllerLib({ adapters: {} })
        assert.equal(true, false, 'unexpected result')
      } catch (err) {
        assert.include(err.message, 'Use Cases library required')
      }
    })
  })
})
