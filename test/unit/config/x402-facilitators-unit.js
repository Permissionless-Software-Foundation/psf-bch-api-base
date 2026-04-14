/*
  Unit tests for x402 facilitator registry (PayAI, Dexter, CDP).
*/

import { assert } from 'chai'

import {
  getFacilitatorConfig,
  facilitatorRequiresAuth
} from '../../../src/config/x402.js'

describe('#x402 facilitators', () => {
  it('should register PayAI without auth', () => {
    assert.equal(facilitatorRequiresAuth('payai'), false)
    const cfg = getFacilitatorConfig('payai')
    assert.equal(cfg.name, 'PayAI')
    assert.equal(cfg.url, 'https://facilitator.payai.network')
    assert.equal(cfg.requiresAuth, false)
  })

  it('should normalize facilitator key case', () => {
    const cfg = getFacilitatorConfig('PAYAI')
    assert.equal(cfg.name, 'PayAI')
  })

  it('should require auth for CDP only', () => {
    assert.equal(facilitatorRequiresAuth('cdp'), true)
    assert.equal(facilitatorRequiresAuth('dexter'), false)
  })
})
