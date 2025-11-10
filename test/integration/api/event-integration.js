/*
  Integration tests for POST /event endpoint.
  These tests require a running Nostr relay.
*/

// npm libraries
import { assert } from 'chai'

// Unit under test
import Server from '../../../bin/server.js'
import { finalizeEvent, getPublicKey, generateSecretKey } from 'nostr-tools/pure'
import { hexToBytes } from '@noble/hashes/utils.js'

describe('#event-integration.js', () => {
  let server
  const baseUrl = 'http://localhost:3001' // Use different port for tests

  before(async () => {
    // Start test server
    server = new Server()
    server.config.port = 3001
    await server.startServer()

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  after(async () => {
    // Stop server
    if (server && server.server) {
      await new Promise((resolve) => {
        server.server.close(() => {
          resolve()
        })
      })
    }
  })

  describe('POST /event', () => {
    it('should publish kind 0 event (profile metadata) - covers example 01', async () => {
      // Generate keys
      const sk = generateSecretKey()

      // Create profile metadata event (kind 0)
      const profileMetadata = {
        name: 'Test User',
        about: 'Integration test user',
        picture: 'https://example.com/test.jpg'
      }

      const eventTemplate = {
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify(profileMetadata)
      }

      // Sign the event
      const signedEvent = finalizeEvent(eventTemplate, sk)

      // Publish to REST API
      const response = await fetch(`${baseUrl}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signedEvent)
      })

      const result = await response.json()

      // Assert response
      assert.equal(response.status, 200)
      assert.property(result, 'accepted')
      assert.property(result, 'eventId')
      assert.equal(result.eventId, signedEvent.id)
    })

    it('should publish kind 1 event (text post) - covers example 03', async () => {
      // Alice's private key from examples
      const alicePrivKeyHex = '3292a48aa331aeccce003d50d70fbd79617ba91860abbd2c78fa4a8301e36bc0'
      const alicePrivKeyBin = hexToBytes(alicePrivKeyHex)
      const alicePubKey = getPublicKey(alicePrivKeyBin)

      // Generate a post
      const eventTemplate = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Integration test post'
      }

      // Sign the post
      const signedEvent = finalizeEvent(eventTemplate, alicePrivKeyBin)

      // Publish to REST API
      const response = await fetch(`${baseUrl}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signedEvent)
      })

      const result = await response.json()

      // Assert response
      assert.equal(response.status, 200)
      assert.property(result, 'accepted')
      assert.property(result, 'eventId')
      assert.equal(result.eventId, signedEvent.id)
      assert.equal(signedEvent.pubkey, alicePubKey)
    })

    it('should publish kind 3 event (follow list) - covers example 06', async () => {
      // Alice's private key
      const alicePrivKeyHex = '3292a48aa331aeccce003d50d70fbd79617ba91860abbd2c78fa4a8301e36bc0'
      const alicePrivKeyBin = hexToBytes(alicePrivKeyHex)

      // Bob's public key
      const bobPrivKeyHex = 'd2e71a977bc3900d6b0f787421e3d1a666cd12ca625482b0d9eeffd23489c99f'
      const bobPrivKeyBin = hexToBytes(bobPrivKeyHex)
      const bobPubKey = getPublicKey(bobPrivKeyBin)

      const psf = 'wss://nostr-relay.psfoundation.info'

      const followList = [
        ['p', bobPubKey, psf, 'bob']
      ]

      // Generate a follow list event (kind 3)
      const eventTemplate = {
        kind: 3,
        created_at: Math.floor(Date.now() / 1000),
        tags: followList,
        content: ''
      }

      // Sign the event
      const signedEvent = finalizeEvent(eventTemplate, alicePrivKeyBin)

      // Publish to REST API
      const response = await fetch(`${baseUrl}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signedEvent)
      })

      const result = await response.json()

      // Assert response
      assert.equal(response.status, 200)
      assert.property(result, 'accepted')
      assert.property(result, 'eventId')
      assert.equal(result.eventId, signedEvent.id)
    })

    it('should publish kind 7 event (reaction/like) - covers example 07', async () => {
      // Bob's private key
      const bobPrivKeyHex = 'd2e71a977bc3900d6b0f787421e3d1a666cd12ca625482b0d9eeffd23489c99f'
      const bobPrivKeyBin = hexToBytes(bobPrivKeyHex)
      const bobPubKey = getPublicKey(bobPrivKeyBin)

      const psf = 'wss://nostr-relay.psfoundation.info'

      // Use a test event ID
      const evIdToLike = 'd09b4c5da59be3cd2768aa53fa78b77bf4859084c94f3bf26d401f004a9c8167'
      const evIdAuthorPubKey = '2c7e76c0f8dc1dca9d0197c7d19be580a8d074ccada6a2f6ebe056ae41092e92'

      // Generate like event (kind 7)
      const likeEventTemplate = {
        kind: 7,
        created_at: Math.floor(Date.now() / 1000),
        pubkey: bobPubKey,
        tags: [
          ['e', evIdToLike, psf],
          ['p', evIdAuthorPubKey, psf]
        ],
        content: '+'
      }

      // Sign the event
      const signedEvent = finalizeEvent(likeEventTemplate, bobPrivKeyBin)

      // Publish to REST API
      const response = await fetch(`${baseUrl}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signedEvent)
      })

      const result = await response.json()

      // Assert response
      assert.equal(response.status, 200)
      assert.property(result, 'accepted')
      assert.property(result, 'eventId')
      assert.equal(result.eventId, signedEvent.id)
    })

    it('should reject invalid event', async () => {
      const invalidEvent = {
        id: 'invalid',
        pubkey: 'invalid',
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [],
        content: 'Test',
        sig: 'invalid'
      }

      const response = await fetch(`${baseUrl}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidEvent)
      })

      const result = await response.json()

      // Should reject invalid event - error response format
      assert.equal(response.status, 400)
      assert.property(result, 'error')
      assert.include(result.error, 'Invalid event structure')
    })

    it('should return 400 when event data is missing', async () => {
      // Send empty body - Express will parse as undefined, controller should handle it
      const response = await fetch(`${baseUrl}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: ''
      })

      // Empty body should be parsed as undefined by Express
      const result = await response.json()

      assert.equal(response.status, 400)
      assert.property(result, 'error')
      assert.include(result.error, 'Event data is required')
    })
  })
})
