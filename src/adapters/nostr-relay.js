/*
  Nostr Relay WebSocket adapter.
  Handles WebSocket connections to Nostr relays and manages message sending/receiving.
*/

import WebSocket from 'ws'
import config from '../config/index.js'
import wlogger from './wlogger.js'

class NostrRelayAdapter {
  constructor (localConfig = {}) {
    this.config = config
    this.relayUrl = localConfig.relayUrl || config.nostrRelayUrl
    this.ws = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 5000 // 5 seconds
    this.messageHandlers = new Map() // Map subscription_id to handlers
    this.pendingMessages = [] // Queue messages while disconnected
    this.eventResolvers = new Map() // Map event_id to promise resolvers for OK responses
    this.subscriptionHandlers = new Map() // Map subscription_id to event handlers

    // Bind methods
    this.connect = this.connect.bind(this)
    this.disconnect = this.disconnect.bind(this)
    this.sendEvent = this.sendEvent.bind(this)
    this.sendReq = this.sendReq.bind(this)
    this.sendClose = this.sendClose.bind(this)
    this.handleMessage = this.handleMessage.bind(this)
    this.handleError = this.handleError.bind(this)
    this.handleClose = this.handleClose.bind(this)
  }

  async connect () {
    if (this.ws && this.isConnected) {
      return true
    }

    return new Promise((resolve, reject) => {
      try {
        wlogger.info(`Connecting to Nostr relay: ${this.relayUrl}`)
        this.ws = new WebSocket(this.relayUrl)

        this.ws.on('open', () => {
          wlogger.info('Connected to Nostr relay')
          this.isConnected = true
          this.reconnectAttempts = 0

          // Send any pending messages
          while (this.pendingMessages.length > 0) {
            const message = this.pendingMessages.shift()
            this.ws.send(JSON.stringify(message))
          }

          resolve(true)
        })

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString())
            this.handleMessage(message)
          } catch (err) {
            wlogger.error('Error parsing relay message:', err)
          }
        })

        this.ws.on('error', this.handleError)
        this.ws.on('close', this.handleClose)

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'))
          }
        }, 10000)
      } catch (err) {
        wlogger.error('Error connecting to relay:', err)
        reject(err)
      }
    })
  }

  async disconnect () {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
      wlogger.info('Disconnected from Nostr relay')
    }
  }

  handleMessage (message) {
    if (!Array.isArray(message) || message.length === 0) {
      return
    }

    const [type, ...args] = message

    switch (type) {
      case 'EVENT':
        // ["EVENT", <subscription_id>, <event>]
        if (args.length >= 2) {
          const subscriptionId = args[0]
          const event = args[1]
          const handler = this.subscriptionHandlers.get(subscriptionId)
          if (handler) {
            handler.onEvent(event)
          }
        }
        break

      case 'OK':
        // ["OK", <event_id>, <true|false>, <message>]
        if (args.length >= 2) {
          const eventId = args[0]
          const accepted = args[1]
          const message = args[2] || ''
          const resolver = this.eventResolvers.get(eventId)
          if (resolver) {
            resolver({ accepted, message })
            this.eventResolvers.delete(eventId)
          }
        }
        break

      case 'EOSE':
        // ["EOSE", <subscription_id>]
        if (args.length >= 1) {
          const subscriptionId = args[0]
          const handler = this.subscriptionHandlers.get(subscriptionId)
          if (handler) {
            handler.onEose()
          }
        }
        break

      case 'CLOSED':
        // ["CLOSED", <subscription_id>, <message>]
        if (args.length >= 1) {
          const subscriptionId = args[0]
          const message = args[1] || ''
          const handler = this.subscriptionHandlers.get(subscriptionId)
          if (handler) {
            handler.onClosed(message)
          }
        }
        break

      case 'NOTICE':
        // ["NOTICE", <message>]
        if (args.length >= 1) {
          const message = args[0]
          wlogger.warn('Relay notice:', message)
        }
        break

      default:
        wlogger.warn('Unknown message type from relay:', type)
    }
  }

  handleError (error) {
    wlogger.error('WebSocket error:', error)
    this.isConnected = false
  }

  handleClose () {
    const now = new Date()
    wlogger.warn(`WebSocket connection closed at ${now.toLocaleString()}`)
    this.isConnected = false

    // Attempt to reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      wlogger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      setTimeout(() => {
        this.connect().catch(err => {
          wlogger.error('Reconnection failed:', err)
        })
      }, this.reconnectDelay)
    }
  }

  async sendMessage (message) {
    if (!this.isConnected || !this.ws) {
      // Queue message for when connection is established
      this.pendingMessages.push(message)
      await this.connect()
      return
    }

    try {
      this.ws.send(JSON.stringify(message))
    } catch (err) {
      wlogger.error('Error sending message:', err)
      throw err
    }
  }

  async sendEvent (event) {
    // ["EVENT", <event>]
    const message = ['EVENT', event]
    await this.sendMessage(message)

    // Return a promise that resolves when we get the OK response
    return new Promise((resolve, reject) => {
      this.eventResolvers.set(event.id, resolve)
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.eventResolvers.has(event.id)) {
          this.eventResolvers.delete(event.id)
          reject(new Error('Timeout waiting for OK response'))
        }
      }, 30000)
    })
  }

  async sendReq (subscriptionId, filters, handlers) {
    // ["REQ", <subscription_id>, <filters>]
    await this.connect()

    // Store handlers for this subscription
    this.subscriptionHandlers.set(subscriptionId, handlers)

    const message = ['REQ', subscriptionId, ...filters]
    await this.sendMessage(message)
  }

  async sendClose (subscriptionId) {
    // ["CLOSE", <subscription_id>]
    const message = ['CLOSE', subscriptionId]
    await this.sendMessage(message)

    // Clean up handlers
    this.subscriptionHandlers.delete(subscriptionId)
    this.messageHandlers.delete(subscriptionId)
  }
}

export default NostrRelayAdapter
