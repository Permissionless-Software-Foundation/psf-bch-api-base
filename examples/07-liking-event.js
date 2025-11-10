/*
  Example script for adding a reaction (like) to an event.
  Refactored to use REST API instead of WebSocket.
  https://github.com/nostr-protocol/nips/blob/master/25.md

  Run the server with `npm start` in the main directory, before running this example.
*/

import { hexToBytes } from '@noble/hashes/utils.js'
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure'

const API_URL = process.env.API_URL || 'http://localhost:5942'

const bobPrivKeyHex = 'd2e71a977bc3900d6b0f787421e3d1a666cd12ca625482b0d9eeffd23489c99f'
const bobPrivKeyBin = hexToBytes(bobPrivKeyHex)
const bobPubKey = getPublicKey(bobPrivKeyBin)

const psf = 'wss://nostr-relay.psfoundation.info'

const evIdToLike = 'd09b4c5da59be3cd2768aa53fa78b77bf4859084c94f3bf26d401f004a9c8167'
const evIdAuthorPubKey = '2c7e76c0f8dc1dca9d0197c7d19be580a8d074ccada6a2f6ebe056ae41092e92'

// Generate like event (kind 7)
const likeEventTemplate = {
  kind: 7,
  created_at: Math.floor(Date.now() / 1000),
  pubkey: bobPubKey,
  tags: [
    ['e', evIdToLike, psf], // "e" tag includes event id, relay reference
    ['p', evIdAuthorPubKey, psf] // "p" tag includes author pubkey, relay reference
  ],
  content: '+'
}

// Sign the event
const signedEvent = finalizeEvent(likeEventTemplate, bobPrivKeyBin)
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
    console.log('Like published successfully!')
  } else {
    console.error('Failed to publish like:', result.message)
  }
} catch (err) {
  console.error('Error publishing like:', err)
}
