/*
  Mock responses from Nostr relay for unit tests.
  Contains mock messages that would come from a Nostr relay WebSocket.
*/

import { mockKind1Event, validEventId } from './event-mocks.js'

// Mock OK response (event accepted)
const mockOkAccepted = ['OK', validEventId, true, 'event saved']

// Mock OK response (event rejected)
const mockOkRejected = ['OK', validEventId, false, 'duplicate: event already exists']

// Mock EVENT message (from relay)
const mockEventMessage = ['EVENT', 'subscription-id-123', mockKind1Event]

// Mock EOSE message (end of stored events)
const mockEoseMessage = ['EOSE', 'subscription-id-123']

// Mock CLOSED message
const mockClosedMessage = ['CLOSED', 'subscription-id-123', 'subscription closed']

// Mock NOTICE message
const mockNoticeMessage = ['NOTICE', 'rate limited: slow down']

// Mock successful sendEvent response
const mockSendEventSuccess = {
  accepted: true,
  message: 'event saved'
}

// Mock failed sendEvent response
const mockSendEventFailure = {
  accepted: false,
  message: 'duplicate: event already exists'
}

// Mock events array for query tests
const mockEventsArray = [
  mockKind1Event,
  {
    ...mockKind1Event,
    id: 'b'.repeat(64),
    content: 'Another test message'
  }
]

export {
  mockOkAccepted,
  mockOkRejected,
  mockEventMessage,
  mockEoseMessage,
  mockClosedMessage,
  mockNoticeMessage,
  mockSendEventSuccess,
  mockSendEventFailure,
  mockEventsArray
}
