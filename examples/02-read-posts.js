/*
  Example script for reading posts (kind 1 events) from a relay.
  Refactored to use REST API instead of WebSocket.

  Run the server with `npm start` in the main directory, before running this example.
*/

const API_URL = process.env.API_URL || 'http://localhost:5942'

// JB55's public key
const jb55 = '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'

// Create subscription ID
const subId = 'read-posts-' + Date.now()

// Create filters - read posts from JB55
const filters = {
  limit: 2,
  kinds: [1],
  authors: [jb55]
}

try {
  // Query events using GET /req/:subId
  const filtersJson = encodeURIComponent(JSON.stringify([filters]))
  const url = `${API_URL}/req/${subId}?filters=${filtersJson}`

  console.log(`Querying events from ${API_URL}`)
  console.log('Filters:', JSON.stringify(filters, null, 2))

  const response = await fetch(url)
  const events = await response.json()

  console.log(`\nReceived ${events.length} events:`)
  events.forEach((ev, index) => {
    console.log(`\nEvent ${index + 1}:`)
    console.log('  ID:', ev.id)
    console.log('  Author:', ev.pubkey)
    console.log('  Created:', new Date(ev.created_at * 1000).toISOString())
    console.log('  Content:', ev.content)
  })
} catch (err) {
  console.error('Error reading posts:', err)
}
