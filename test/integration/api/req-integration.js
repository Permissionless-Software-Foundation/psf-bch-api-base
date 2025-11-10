/*
  Integration tests for GET /req/:subId endpoint.
  These tests require a running Nostr relay.
*/

// npm libraries
import { assert } from 'chai'

// Unit under test
import Server from '../../../bin/server.js'
import { getPublicKey } from 'nostr-tools/pure'
import { hexToBytes } from '@noble/hashes/utils.js'

describe('#req-integration.js', () => {
  let server
  const baseUrl = 'http://localhost:3002' // Use different port for tests

  before(async () => {
    // Start test server
    server = new Server()
    server.config.port = 3002
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

  describe('GET /req/:subId', () => {
    it('should query kind 1 events (posts) - covers examples 02, 04', async () => {
      // JB55's public key from example 02
      const jb55 = '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'

      // Create subscription ID
      const subId = 'read-posts-' + Date.now()

      // Create filters - read posts from JB55
      const filters = {
        limit: 2,
        kinds: [1],
        authors: [jb55]
      }

      // Query events using GET /req/:subId
      const filtersJson = encodeURIComponent(JSON.stringify([filters]))
      const url = `${baseUrl}/req/${subId}?filters=${filtersJson}`

      const response = await fetch(url)
      const events = await response.json()

      // Assert response
      assert.equal(response.status, 200)
      assert.isArray(events)
      // May be empty if no events exist, but structure should be correct
      if (events.length > 0) {
        assert.property(events[0], 'id')
        assert.property(events[0], 'pubkey')
        assert.property(events[0], 'created_at')
        assert.property(events[0], 'kind')
        assert.property(events[0], 'content')
        assert.equal(events[0].kind, 1)
      }
    })

    it('should query Alice posts - covers example 04', async () => {
      // Alice's public key
      const alicePrivKeyHex = '3292a48aa331aeccce003d50d70fbd79617ba91860abbd2c78fa4a8301e36bc0'
      const alicePrivKeyBin = hexToBytes(alicePrivKeyHex)
      const alicePubKey = getPublicKey(alicePrivKeyBin)

      // Create subscription ID
      const subId = 'read-alice-posts-' + Date.now()

      // Create filters - read posts from Alice
      const filters = {
        limit: 2,
        kinds: [1],
        authors: [alicePubKey]
      }

      // Query events using GET /req/:subId
      const filtersJson = encodeURIComponent(JSON.stringify([filters]))
      const url = `${baseUrl}/req/${subId}?filters=${filtersJson}`

      const response = await fetch(url)
      const events = await response.json()

      // Assert response
      assert.equal(response.status, 200)
      assert.isArray(events)
      if (events.length > 0) {
        assert.equal(events[0].pubkey, alicePubKey)
        assert.equal(events[0].kind, 1)
      }
    })

    it('should query kind 3 events (follow list) - covers example 05', async () => {
      // Alice's public key
      const alicePrivKeyHex = '3292a48aa331aeccce003d50d70fbd79617ba91860abbd2c78fa4a8301e36bc0'
      const alicePrivKeyBin = hexToBytes(alicePrivKeyHex)
      const alicePubKey = getPublicKey(alicePrivKeyBin)

      // Create subscription ID
      const subId = 'get-follow-list-' + Date.now()

      // Create filters - get follow list (kind 3) from Alice
      const filters = {
        limit: 5,
        kinds: [3],
        authors: [alicePubKey]
      }

      // Query events using GET /req/:subId
      const filtersJson = encodeURIComponent(JSON.stringify([filters]))
      const url = `${baseUrl}/req/${subId}?filters=${filtersJson}`

      const response = await fetch(url)
      const events = await response.json()

      // Assert response
      assert.equal(response.status, 200)
      assert.isArray(events)
      if (events.length > 0) {
        assert.equal(events[0].kind, 3)
        assert.equal(events[0].pubkey, alicePubKey)
        assert.isArray(events[0].tags)
      }
    })

    it('should handle filters as individual query params', async () => {
      const subId = 'test-sub-' + Date.now()
      const url = `${baseUrl}/req/${subId}?kinds=[1]&limit=10`

      const response = await fetch(url)
      const events = await response.json()

      assert.equal(response.status, 200)
      assert.isArray(events)
    })

    it('should return 400 when subscription ID is missing', async () => {
      const url = `${baseUrl}/req/?filters=${encodeURIComponent(JSON.stringify([{ kinds: [1] }]))}`

      const response = await fetch(url)
      await response.json()

      // Should return 404 or 400
      assert.isAtLeast(response.status, 400)
    })

    it('should return 400 when filters JSON is invalid', async () => {
      const subId = 'test-sub-' + Date.now()
      const url = `${baseUrl}/req/${subId}?filters=invalid-json{`

      const response = await fetch(url)
      const result = await response.json()

      assert.equal(response.status, 400)
      assert.property(result, 'error')
      assert.include(result.error, 'Invalid filters JSON')
    })
  })
})
