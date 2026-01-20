/*
  Example script for writing a post to a relay.
  Refactored to use REST API instead of WebSocket.

  Run the server with `npm start` in the main directory, before running this example.
*/

import { finalizeEvent, getPublicKey } from 'nostr-tools/pure'
import { hexToBytes } from '@noble/hashes/utils.js'

const API_URL = process.env.API_URL || 'http://localhost:5942'

// Alice is our user making the post.
const alicePrivKeyHex = '3292a48aa331aeccce003d50d70fbd79617ba91860abbd2c78fa4a8301e36bc0'
const alicePrivKeyBin = hexToBytes(alicePrivKeyHex)
const alicePubKey = getPublicKey(alicePrivKeyBin)
console.log(`Alice Public Key: ${alicePubKey}`)

const now = new Date()

// Generate a post.
const eventTemplate = {
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: `This is a test message posted at ${now.toLocaleString()}`
}
console.log(`eventTemplate: ${JSON.stringify(eventTemplate, null, 2)}`)

// Sign the post
const signedEvent = finalizeEvent(eventTemplate, alicePrivKeyBin)
console.log('signedEvent:', JSON.stringify(signedEvent, null, 2))

// Publish to REST API
try {
  const response = await fetch(`${API_URL}/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(signedEvent)
  })

  const result = await response.json()
  console.log('result:', result)

  if (result.accepted) {
    console.log('Post published successfully!')
    console.log('Event ID:', result.eventId)
  } else {
    console.error('Failed to publish:', result.message)
  }
} catch (err) {
  console.error('Error publishing post:', err)
}
