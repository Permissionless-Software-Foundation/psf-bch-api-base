/*
  Use case: Query events from the relay (stateless).
  This encapsulates the business logic for querying events.
*/

import wlogger from '../adapters/wlogger.js'

class QueryEventsUseCase {
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
   * Query events with filters from all relays (stateless - returns immediately)
   * @param {Array} filters - Array of filter objects
   * @param {string} subscriptionId - Unique subscription ID
   * @returns {Promise<Array>} Array of events (merged and de-duplicated from all relays)
   */
  async execute (filters, subscriptionId) {
    try {
      wlogger.info(`Querying events with subscription ${subscriptionId} from ${this.adapters.nostrRelays.length} relay(s)`)

      // Query all relays concurrently and merge results
      const events = await this.adapters.queryAllRelays(filters, subscriptionId)

      wlogger.info(`Query returned ${events.length} events from ${this.adapters.nostrRelays.length} relay(s)`)
      return events
    } catch (err) {
      wlogger.error('Error in QueryEventsUseCase:', err)
      throw err
    }
  }
}

export default QueryEventsUseCase
