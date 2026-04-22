export class RoundRobinFacilitatorClient {
  constructor (facilitatorEntries = []) {
    if (!Array.isArray(facilitatorEntries) || facilitatorEntries.length === 0) {
      throw new Error('RoundRobinFacilitatorClient requires at least one facilitator entry.')
    }

    this.entries = facilitatorEntries
    this.cursorByKey = new Map()
  }

  async getSupported () {
    const supportedList = await Promise.all(this.entries.map(async (entry) => {
      const supported = await entry.client.getSupported()
      return {
        supported,
        entry
      }
    }))

    const kindsByKey = new Map()
    const extensionsByKey = new Map()
    const signers = {}

    for (const { supported } of supportedList) {
      for (const kind of (supported?.kinds || [])) {
        const key = `${kind.x402Version}|${kind.network}|${kind.scheme}`
        if (!kindsByKey.has(key)) {
          kindsByKey.set(key, kind)
        }
      }

      for (const ext of (supported?.extensions || [])) {
        const key = JSON.stringify(ext)
        if (!extensionsByKey.has(key)) {
          extensionsByKey.set(key, ext)
        }
      }

      const signerMap = supported?.signers || {}
      for (const [networkKey, addresses] of Object.entries(signerMap)) {
        if (!Array.isArray(addresses)) continue
        if (!Array.isArray(signers[networkKey])) {
          signers[networkKey] = []
        }
        for (const addr of addresses) {
          if (!signers[networkKey].includes(addr)) {
            signers[networkKey].push(addr)
          }
        }
      }
    }

    return {
      kinds: Array.from(kindsByKey.values()),
      extensions: Array.from(extensionsByKey.values()),
      signers
    }
  }

  async verify (paymentPayload, paymentRequirements) {
    let lastError
    for (const entry of this.entries) {
      try {
        return await entry.client.verify(paymentPayload, paymentRequirements)
      } catch (err) {
        lastError = err
      }
    }

    throw lastError || new Error('All facilitators failed verify().')
  }

  async settle (paymentPayload, paymentRequirements) {
    const key = this.getRoundRobinKey(paymentPayload, paymentRequirements)
    const length = this.entries.length
    const start = this.cursorByKey.get(key) || 0
    const attempts = []

    for (let offset = 0; offset < length; offset++) {
      const idx = (start + offset) % length
      const entry = this.entries[idx]
      try {
        const result = await entry.client.settle(paymentPayload, paymentRequirements)
        this.cursorByKey.set(key, (idx + 1) % length)
        return result
      } catch (err) {
        attempts.push({
          name: entry.name || entry.key || `facilitator-${idx}`,
          url: entry.url || '',
          error: err?.message || String(err)
        })
      }
    }

    const message = attempts
      .map(a => `${a.name}${a.url ? ` (${a.url})` : ''}: ${a.error}`)
      .join(' | ')
    throw new Error(`All facilitators failed settle() for ${key}. Attempts: ${message}`)
  }

  getRoundRobinKey (paymentPayload, paymentRequirements) {
    const version = paymentPayload?.x402Version || 'unknown'
    const network = paymentRequirements?.network || 'unknown'
    const scheme = paymentRequirements?.scheme || 'unknown'
    return `${version}|${network}|${scheme}`
  }
}
