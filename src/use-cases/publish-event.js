/*
  Use case: Publish a Nostr event to the relay.
  This encapsulates the business logic for publishing events.
*/

import Event from '../entities/event.js'
import wlogger from '../adapters/wlogger.js'

class PublishEventUseCase {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error('Adapters instance required')
    }
    if (!this.adapters.nostrRelays || !Array.isArray(this.adapters.nostrRelays) || this.adapters.nostrRelays.length === 0) {
      throw new Error('NostrRelay adapters array required')
    }
  }

  /**
   * Publish an event to all Nostr relays (broadcast)
   * @param {Object} eventData - Event data (must be signed)
   * @returns {Promise<Object>} Result with accepted status, message, and relay results
   */
  async execute (eventData) {
    try {
      // Create event entity
      const event = new Event(eventData)

      // Validate event
      if (!event.isValid()) {
        throw new Error('Invalid event structure')
      }

      wlogger.info(`Publishing event ${event.id} (kind ${event.kind}) to ${this.adapters.nostrRelays.length} relay(s)`)

      // Broadcast event to all relays
      const results = await this.adapters.broadcastEvent(event.toJSON())

      // Aggregate results
      const acceptedRelays = results.filter(r => r.accepted)
      const rejectedRelays = results.filter(r => !r.accepted)
      const failedRelays = results.filter(r => !r.success)

      const atLeastOneAccepted = acceptedRelays.length > 0
      const allAccepted = acceptedRelays.length === results.length && failedRelays.length === 0

      // Build aggregated message
      let message = ''
      if (allAccepted) {
        message = `Accepted by all ${acceptedRelays.length} relay(s)`
      } else if (atLeastOneAccepted) {
        message = `Accepted by ${acceptedRelays.length}/${results.length} relay(s)`
        if (rejectedRelays.length > 0) {
          message += `, rejected by ${rejectedRelays.length} relay(s)`
        }
        if (failedRelays.length > 0) {
          message += `, failed to reach ${failedRelays.length} relay(s)`
        }
      } else {
        message = `Rejected or failed by all ${results.length} relay(s)`
        if (rejectedRelays.length > 0) {
          const rejectionMessages = rejectedRelays.map(r => r.message).filter(m => m).join('; ')
          if (rejectionMessages) {
            message += `: ${rejectionMessages}`
          }
        }
      }

      wlogger.info(`Event ${event.id} ${atLeastOneAccepted ? 'accepted' : 'rejected/failed'}: ${message}`)

      return {
        accepted: atLeastOneAccepted,
        message,
        eventId: event.id,
        relayResults: results,
        acceptedCount: acceptedRelays.length,
        totalRelays: results.length
      }
    } catch (err) {
      wlogger.error('Error in PublishEventUseCase:', err)
      throw err
    }
  }
}

export default PublishEventUseCase
