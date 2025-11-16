/*
  Main entry point for REST2NOSTR Proxy API
*/

import Server from './bin/server.js'

const server = new Server()
server.startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
