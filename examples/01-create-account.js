/*
  Example script creating a key-pair for a Nostr account and publishing profile metadata.
  Refactored to use REST API instead of WebSocket.

  Run the server with `npm start` in the main directory, before running this example.
*/

import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure'
import * as nip19 from 'nostr-tools/nip19'
import { bytesToHex } from '@noble/hashes/utils.js'

const API_URL = process.env.API_URL || 'http://localhost:5942'

// Generate keys
const sk = generateSecretKey() // `sk` is a Uint8Array
const nsec = nip19.nsecEncode(sk)
const skHex = bytesToHex(sk)

const pk = getPublicKey(sk) // `pk` is a hex string
const npub = nip19.npubEncode(pk)

console.log('private key:', skHex)
console.log('encoded private key:', nsec)
console.log()
console.log('public key:', pk)
console.log('encoded public key:', npub)
console.log()

// Create profile metadata event (kind 0)
const profileMetadata = {
  name: 'Alice',
  about: 'Hello, I am Alice!',
  picture: 'https://example.com/alice.jpg'
}

const eventTemplate = {
  kind: 0,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: JSON.stringify(profileMetadata)
}

// Sign the event
const signedEvent = finalizeEvent(eventTemplate, sk)
console.log('Signed event:', JSON.stringify(signedEvent, null, 2))

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
  console.log('Publish result:', result)

  if (result.accepted) {
    console.log('Profile metadata published successfully!')
  } else {
    console.error('Failed to publish:', result.message)
  }
} catch (err) {
  console.error('Error publishing event:', err)
}
