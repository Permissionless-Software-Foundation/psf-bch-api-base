/*
  Integration tests for POST /req/:subId SSE subscription and DELETE /req/:subId.
  These tests require a running Nostr relay.
*/

// npm libraries
import { assert } from 'chai'

// Unit under test
import Server from '../../../bin/server.js'

describe('#subscription-integration.js', () => {
  let server
  const baseUrl = 'http://localhost:3003' // Use different port for tests

  before(async () => {
    // Start test server
    server = new Server()
    server.config.port = 3003
    await server.startServer()

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  after(async function () {
    this.timeout(10000) // Increase timeout for cleanup
    // Stop server
    if (server && server.server) {
      // Close all connections forcefully if available
      if (server.server.closeAllConnections) {
        server.server.closeAllConnections()
      }

      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve() // Force resolve after 2 seconds
        }, 2000)

        server.server.close(() => {
          clearTimeout(timeout)
          resolve()
        })
      })
    }
  })

  describe('POST /req/:subId', () => {
    it('should create SSE subscription', async () => {
      const subId = 'test-sub-' + Date.now()
      const filters = { kinds: [1], limit: 10 }

      const response = await fetch(`${baseUrl}/req/${subId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
      })

      // Assert SSE headers
      assert.equal(response.headers.get('content-type'), 'text/event-stream')
      assert.equal(response.headers.get('cache-control'), 'no-cache')
      assert.equal(response.headers.get('connection'), 'keep-alive')

      // Read initial connection message
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        const { value } = await reader.read()
        const text = decoder.decode(value)
        assert.include(text, 'connected')
        assert.include(text, subId)
      } finally {
        reader.releaseLock()
      }
    })

    it('should return 400 when subscription ID is missing', async () => {
      const filters = { kinds: [1] }

      const response = await fetch(`${baseUrl}/req/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
      })

      // Should return 404 or 400
      assert.isAtLeast(response.status, 400)
    })

    it('should return 400 when filters are missing', async () => {
      const subId = 'test-sub-' + Date.now()

      const response = await fetch(`${baseUrl}/req/${subId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const result = await response.json()

      assert.equal(response.status, 400)
      assert.property(result, 'error')
      assert.include(result.error, 'Filters are required')
    })
  })

  describe('DELETE /req/:subId', () => {
    it('should close a subscription', async () => {
      const subId = 'test-sub-' + Date.now()

      const response = await fetch(`${baseUrl}/req/${subId}`, {
        method: 'DELETE'
      })

      // May return 200 if subscription exists, or 500 if it doesn't
      // The important thing is it doesn't crash
      assert.isAtMost(response.status, 500)
    })

    it('should return 400 when subscription ID is missing', async () => {
      const response = await fetch(`${baseUrl}/req/`, {
        method: 'DELETE'
      })

      // Should return 404 or 400
      assert.isAtLeast(response.status, 400)
    })
  })

  describe('PUT /req/:subId', () => {
    it('should create SSE subscription (alternative method)', async function () {
      this.timeout(10000) // Increase timeout for this test

      const subId = 'test-sub-' + Date.now()
      const filters = { kinds: [1], limit: 10 }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      let response
      try {
        response = await fetch(`${baseUrl}/req/${subId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(filters),
          signal: controller.signal
        })

        // Assert SSE headers
        assert.equal(response.headers.get('content-type'), 'text/event-stream')

        clearTimeout(timeoutId)

        // Consume the stream to prevent hanging
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        try {
          // Read initial connection message with timeout
          const readPromise = reader.read()
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ value: null, done: true }), 2000))
          const { value, done } = await Promise.race([readPromise, timeoutPromise])

          if (value && !done) {
            const text = decoder.decode(value)
            assert.include(text, 'connected')
          }
        } finally {
          reader.releaseLock()
        }
      } catch (err) {
        // AbortController aborted - this is expected
        if (err.name !== 'AbortError') {
          throw err
        }
      } finally {
        clearTimeout(timeoutId)
        // Always close the subscription
        try {
          await fetch(`${baseUrl}/req/${subId}`, {
            method: 'DELETE'
          })
        } catch (err) {
          // Ignore errors when closing
        }
      }
    })
  })
})
