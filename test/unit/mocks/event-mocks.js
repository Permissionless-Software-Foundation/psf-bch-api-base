/*
  Mock event data for unit tests.
  Contains mock Nostr events for various event kinds.
*/

// Alice's public key from examples
const alicePubKey = '2c7e76c0f8dc1dca9d0197c7d19be580a8d074ccada6a2f6ebe056ae41092e92'
const bobPubKey = 'b'.repeat(64)

// Valid event ID (64 hex chars)
const validEventId = 'd09b4c5da59be3cd2768aa53fa78b77bf4859084c94f3bf26d401f004a9c8167'
// Valid signature (128 hex chars)
const validSig = 'a'.repeat(128)

// Kind 0: Profile metadata event
const mockKind0Event = {
  id: validEventId,
  pubkey: alicePubKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 0,
  tags: [],
  content: JSON.stringify({
    name: 'Alice',
    about: 'Hello, I am Alice!',
    picture: 'https://example.com/alice.jpg'
  }),
  sig: validSig
}

// Kind 1: Text post event
const mockKind1Event = {
  id: validEventId,
  pubkey: alicePubKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'This is a test message',
  sig: validSig
}

// Kind 3: Follow list event
const mockKind3Event = {
  id: validEventId,
  pubkey: alicePubKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 3,
  tags: [
    ['p', bobPubKey, 'wss://nostr-relay.psfoundation.info', 'bob']
  ],
  content: '',
  sig: validSig
}

// Kind 7: Reaction/like event
const mockKind7Event = {
  id: validEventId,
  pubkey: bobPubKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 7,
  tags: [
    ['e', validEventId, 'wss://nostr-relay.psfoundation.info'],
    ['p', alicePubKey, 'wss://nostr-relay.psfoundation.info']
  ],
  content: '+',
  sig: validSig
}

// Invalid events for testing validation
const mockInvalidEventMissingId = {
  pubkey: alicePubKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Test',
  sig: validSig
}

const mockInvalidEventWrongIdLength = {
  id: 'short',
  pubkey: alicePubKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Test',
  sig: validSig
}

const mockInvalidEventMissingPubkey = {
  id: validEventId,
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Test',
  sig: validSig
}

const mockInvalidEventWrongPubkeyLength = {
  id: validEventId,
  pubkey: 'short',
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Test',
  sig: validSig
}

const mockInvalidEventMissingCreatedAt = {
  id: validEventId,
  pubkey: alicePubKey,
  kind: 1,
  tags: [],
  content: 'Test',
  sig: validSig
}

const mockInvalidEventWrongCreatedAtType = {
  id: validEventId,
  pubkey: alicePubKey,
  created_at: 'not-a-number',
  kind: 1,
  tags: [],
  content: 'Test',
  sig: validSig
}

const mockInvalidEventMissingKind = {
  id: validEventId,
  pubkey: alicePubKey,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: 'Test',
  sig: validSig
}

const mockInvalidEventKindOutOfRange = {
  id: validEventId,
  pubkey: alicePubKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 70000, // Out of range (0-65535)
  tags: [],
  content: 'Test',
  sig: validSig
}

const mockInvalidEventMissingSig = {
  id: validEventId,
  pubkey: alicePubKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Test'
}

const mockInvalidEventWrongSigLength = {
  id: validEventId,
  pubkey: alicePubKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: [],
  content: 'Test',
  sig: 'short'
}

const mockInvalidEventTagsNotArray = {
  id: validEventId,
  pubkey: alicePubKey,
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  tags: 'not-an-array',
  content: 'Test',
  sig: validSig
}

export {
  mockKind0Event,
  mockKind1Event,
  mockKind3Event,
  mockKind7Event,
  mockInvalidEventMissingId,
  mockInvalidEventWrongIdLength,
  mockInvalidEventMissingPubkey,
  mockInvalidEventWrongPubkeyLength,
  mockInvalidEventMissingCreatedAt,
  mockInvalidEventWrongCreatedAtType,
  mockInvalidEventMissingKind,
  mockInvalidEventKindOutOfRange,
  mockInvalidEventMissingSig,
  mockInvalidEventWrongSigLength,
  mockInvalidEventTagsNotArray,
  alicePubKey,
  bobPubKey,
  validEventId,
  validSig
}
