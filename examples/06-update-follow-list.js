/*
  Example to update the follow list with a new list of people to follow.
  Refactored to use REST API instead of WebSocket.

  Run the server with `npm start` in the main directory, before running this example.
*/

import { finalizeEvent, getPublicKey } from 'nostr-tools/pure'
import { hexToBytes } from '@noble/hashes/utils.js'

const API_URL = process.env.API_URL || 'http://localhost:5942'

// Alice wants to update her follow list
const alicePrivKeyHex = '3292a48aa331aeccce003d50d70fbd79617ba91860abbd2c78fa4a8301e36bc0'
const alicePrivKeyBin = hexToBytes(alicePrivKeyHex)
const alicePubKey = getPublicKey(alicePrivKeyBin)
console.log(`Alice Public Key: ${alicePubKey}`)

// Bob is the person to be added to the new follow list
const bobPrivKeyHex = 'd2e71a977bc3900d6b0f787421e3d1a666cd12ca625482b0d9eeffd23489c99f'
const bobPrivKeyBin = hexToBytes(bobPrivKeyHex)
const bobPubKey = getPublicKey(bobPrivKeyBin)
console.log(`Bob Public Key: ${bobPubKey}`)

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
console.log(`eventTemplate: ${JSON.stringify(eventTemplate, null, 2)}`)

// Sign the event
const signedEvent = finalizeEvent(eventTemplate, alicePrivKeyBin)

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
    console.log('Follow list updated successfully!')
  } else {
    console.error('Failed to update follow list:', result.message)
  }
} catch (err) {
  console.error('Error updating follow list:', err)
}
