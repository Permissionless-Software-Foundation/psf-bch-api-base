/*
  Unit tests for the Event entity.
*/

// npm libraries
import { assert } from 'chai'

// Mocking data libraries
import {
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
  mockInvalidEventTagsNotArray
} from '../mocks/event-mocks.js'

// Unit under test
import Event from '../../../src/entities/event.js'

describe('#event.js', () => {
  describe('#isValid()', () => {
    it('should return true for valid kind 0 event', () => {
      const event = new Event(mockKind0Event)
      assert.isTrue(event.isValid())
    })

    it('should return true for valid kind 1 event', () => {
      const event = new Event(mockKind1Event)
      assert.isTrue(event.isValid())
    })

    it('should return true for valid kind 3 event', () => {
      const event = new Event(mockKind3Event)
      assert.isTrue(event.isValid())
    })

    it('should return true for valid kind 7 event', () => {
      const event = new Event(mockKind7Event)
      assert.isTrue(event.isValid())
    })

    it('should return false for event missing id', () => {
      const event = new Event(mockInvalidEventMissingId)
      assert.isFalse(event.isValid())
    })

    it('should return false for event with wrong id length', () => {
      const event = new Event(mockInvalidEventWrongIdLength)
      assert.isFalse(event.isValid())
    })

    it('should return false for event missing pubkey', () => {
      const event = new Event(mockInvalidEventMissingPubkey)
      assert.isFalse(event.isValid())
    })

    it('should return false for event with wrong pubkey length', () => {
      const event = new Event(mockInvalidEventWrongPubkeyLength)
      assert.isFalse(event.isValid())
    })

    it('should return false for event missing created_at', () => {
      const event = new Event(mockInvalidEventMissingCreatedAt)
      assert.isFalse(event.isValid())
    })

    it('should return false for event with wrong created_at type', () => {
      const event = new Event(mockInvalidEventWrongCreatedAtType)
      assert.isFalse(event.isValid())
    })

    it('should return false for event missing kind', () => {
      const event = new Event(mockInvalidEventMissingKind)
      assert.isFalse(event.isValid())
    })

    it('should return false for event with kind out of range', () => {
      const event = new Event(mockInvalidEventKindOutOfRange)
      assert.isFalse(event.isValid())
    })

    it('should return false for event missing sig', () => {
      const event = new Event(mockInvalidEventMissingSig)
      assert.isFalse(event.isValid())
    })

    it('should return false for event with wrong sig length', () => {
      const event = new Event(mockInvalidEventWrongSigLength)
      assert.isFalse(event.isValid())
    })

    it('should return false for event with tags not an array', () => {
      const event = new Event(mockInvalidEventTagsNotArray)
      assert.isFalse(event.isValid())
    })
  })

  describe('#toJSON()', () => {
    it('should serialize event to JSON correctly', () => {
      const event = new Event(mockKind1Event)
      const json = event.toJSON()

      assert.property(json, 'id')
      assert.property(json, 'pubkey')
      assert.property(json, 'created_at')
      assert.property(json, 'kind')
      assert.property(json, 'tags')
      assert.property(json, 'content')
      assert.property(json, 'sig')

      assert.equal(json.id, mockKind1Event.id)
      assert.equal(json.pubkey, mockKind1Event.pubkey)
      assert.equal(json.created_at, mockKind1Event.created_at)
      assert.equal(json.kind, mockKind1Event.kind)
      assert.deepEqual(json.tags, mockKind1Event.tags)
      assert.equal(json.content, mockKind1Event.content)
      assert.equal(json.sig, mockKind1Event.sig)
    })

    it('should serialize event with tags correctly', () => {
      const event = new Event(mockKind3Event)
      const json = event.toJSON()

      assert.isArray(json.tags)
      assert.equal(json.tags.length, 1)
      assert.deepEqual(json.tags, mockKind3Event.tags)
    })
  })
})
