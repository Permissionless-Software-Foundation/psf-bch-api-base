/*
  Example script for reading posts from user Alice.
  Refactored to use REST API instead of WebSocket.

  Run the server with `npm start` in the main directory, before running this example.
*/

import { getPublicKey } from 'nostr-tools/pure'
import { hexToBytes } from '@noble/hashes/utils.js'

const API_URL = process.env.API_URL || 'http://localhost:5942'

// Alice is our user.
const alicePrivKeyHex = '3292a48aa331aeccce003d50d70fbd79617ba91860abbd2c78fa4a8301e36bc0'
const alicePrivKeyBin = hexToBytes(alicePrivKeyHex)
const alicePubKey = getPublicKey(alicePrivKeyBin)
console.log(`Alice Public Key: ${alicePubKey}`)

// Create subscription ID
const subId = 'read-alice-posts-' + Date.now()

// Create filters - read posts from Alice
const filters = {
  limit: 2,
  kinds: [1],
  authors: [alicePubKey]
}

try {
  // Query events using GET /req/:subId
  const filtersJson = encodeURIComponent(JSON.stringify([filters]))
  const url = `${API_URL}/req/${subId}?filters=${filtersJson}`

  console.log(`Querying events from ${API_URL}`)
  console.log('Filters:', JSON.stringify(filters, null, 2))

  const response = await fetch(url)
  const events = await response.json()

  console.log(`\nReceived ${events.length} events from Alice:`)
  events.forEach((ev, index) => {
    console.log(`\nEvent ${index + 1}:`)
    console.log('  ID:', ev.id)
    console.log('  Created:', new Date(ev.created_at * 1000).toISOString())
    console.log('  Content:', ev.content)
  })
} catch (err) {
  console.error('Error reading Alice posts:', err)
}
