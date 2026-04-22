/*
  Multi-facilitator and Bazaar route config (env-dependent helpers).
*/

import { assert } from 'chai'

import {
  getActiveFacilitatorKeys,
  getFacilitatorHttpUrl
} from '../../../src/config/x402.js'

describe('#x402 multi-facilitator + bazaar helpers', () => {
  const saved = {}

  beforeEach(() => {
    saved.ACTIVE_FACILITATORS = process.env.ACTIVE_FACILITATORS
    saved.PRIMARY_FACILITATOR = process.env.PRIMARY_FACILITATOR
    delete process.env.ACTIVE_FACILITATORS
    process.env.PRIMARY_FACILITATOR = 'cdp'
  })

  afterEach(() => {
    if (saved.ACTIVE_FACILITATORS === undefined) delete process.env.ACTIVE_FACILITATORS
    else process.env.ACTIVE_FACILITATORS = saved.ACTIVE_FACILITATORS
    if (saved.PRIMARY_FACILITATOR === undefined) delete process.env.PRIMARY_FACILITATOR
    else process.env.PRIMARY_FACILITATOR = saved.PRIMARY_FACILITATOR
  })

  it('getActiveFacilitatorKeys puts PRIMARY_FACILITATOR first, then ACTIVE_FACILITATORS', () => {
    process.env.PRIMARY_FACILITATOR = 'cdp'
    process.env.ACTIVE_FACILITATORS = 'payai,cdp,dexter'
    assert.deepEqual(getActiveFacilitatorKeys(), ['cdp', 'payai', 'dexter'])
  })

  it('getActiveFacilitatorKeys prepends primary when not listed in ACTIVE_FACILITATORS', () => {
    process.env.PRIMARY_FACILITATOR = 'cdp'
    process.env.ACTIVE_FACILITATORS = 'dexter,payai'
    assert.deepEqual(getActiveFacilitatorKeys(), ['cdp', 'dexter', 'payai'])
  })

  it('getActiveFacilitatorKeys falls back to PRIMARY_FACILITATOR', () => {
    process.env.PRIMARY_FACILITATOR = 'dexter'
    assert.deepEqual(getActiveFacilitatorKeys(), ['dexter'])
  })

  it('getFacilitatorHttpUrl returns known bases', () => {
    assert.include(getFacilitatorHttpUrl('cdp'), 'cdp.coinbase.com')
    assert.equal(getFacilitatorHttpUrl('dexter'), 'https://x402.dexter.cash')
    assert.equal(getFacilitatorHttpUrl('payai'), 'https://facilitator.payai.network')
  })
})
