/*
  Example script for getting a follow list (kind 3 events).
  Refactored to use REST API instead of WebSocket.

  Run the server with `npm start` in the main directory, before running this example.
*/

import { getPublicKey } from 'nostr-tools/pure'
import { hexToBytes } from '@noble/hashes/utils.js'

const API_URL = process.env.API_URL || 'http://localhost:5942'

// Alice is our user to get the follow list.
const alicePrivKeyHex = '3292a48aa331aeccce003d50d70fbd79617ba91860abbd2c78fa4a8301e36bc0'
const alicePrivKeyBin = hexToBytes(alicePrivKeyHex)
const alicePubKey = getPublicKey(alicePrivKeyBin)
console.log(`Alice Public Key: ${alicePubKey}`)

// Create subscription ID
const subId = 'get-follow-list-' + Date.now()

// Create filters - get follow list (kind 3) from Alice
const filters = {
  limit: 5,
  kinds: [3],
  authors: [alicePubKey]
}

try {
  // Query events using GET /req/:subId
  const filtersJson = encodeURIComponent(JSON.stringify([filters]))
  const url = `${API_URL}/req/${subId}?filters=${filtersJson}`

  console.log(`Querying follow list from ${API_URL}`)
  console.log('Filters:', JSON.stringify(filters, null, 2))

  const response = await fetch(url)
  const events = await response.json()

  if (events.length > 0) {
    // Get the most recent follow list (kind 3 events are replaceable)
    const followListEvent = events[0]
    const aliceFollowList = followListEvent.tags.filter(tag => tag[0] === 'p')
    console.log(`\nAlice Follow list (${aliceFollowList.length} followed users):`)
    aliceFollowList.forEach((tag, index) => {
      console.log(`  ${index + 1}. ${tag[1]}${tag[3] ? ` (${tag[3]})` : ''}`)
    })
  } else {
    console.log('\nNo follow list found for Alice')
  }
} catch (err) {
  console.error('Error getting follow list:', err)
}
