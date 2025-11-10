/*
  Event entity - represents a Nostr event.
  This is a domain model following Clean Architecture principles.
*/

class Event {
  constructor (data) {
    this.id = data.id
    this.pubkey = data.pubkey
    this.created_at = data.created_at
    this.kind = data.kind
    this.tags = data.tags || []
    this.content = data.content
    this.sig = data.sig
  }

  /**
   * Validates the event structure
   * @returns {boolean} True if valid
   */
  isValid () {
    if (!this.id || !this.pubkey || !this.created_at || this.kind === undefined || !this.sig) {
      return false
    }

    // Basic type checks
    if (typeof this.id !== 'string' || this.id.length !== 64) {
      return false
    }

    if (typeof this.pubkey !== 'string' || this.pubkey.length !== 64) {
      return false
    }

    if (typeof this.created_at !== 'number') {
      return false
    }

    if (typeof this.kind !== 'number' || this.kind < 0 || this.kind > 65535) {
      return false
    }

    if (typeof this.sig !== 'string' || this.sig.length !== 128) {
      return false
    }

    if (!Array.isArray(this.tags)) {
      return false
    }

    return true
  }

  /**
   * Convert to plain object
   * @returns {Object} Plain event object
   */
  toJSON () {
    return {
      id: this.id,
      pubkey: this.pubkey,
      created_at: this.created_at,
      kind: this.kind,
      tags: this.tags,
      content: this.content,
      sig: this.sig
    }
  }
}

export default Event
