import { assert } from 'chai'
import { RoundRobinFacilitatorClient } from '../../../../src/lib/x402/round-robin-facilitator-client.js'

function makeEntry (name, handlers = {}) {
  return {
    key: name.toLowerCase(),
    name,
    url: `https://${name.toLowerCase()}.example.com`,
    client: {
      getSupported: handlers.getSupported || (async () => ({
        kinds: [{ x402Version: 2, network: 'eip155:8453', scheme: 'exact' }],
        extensions: [],
        signers: {}
      })),
      verify: handlers.verify || (async () => ({ isValid: true })),
      settle: handlers.settle || (async () => ({ success: true, transaction: `${name}-tx` }))
    }
  }
}

describe('#round-robin-facilitator-client', () => {
  it('rotates settle winner across facilitators', async () => {
    const uut = new RoundRobinFacilitatorClient([
      makeEntry('CDP'),
      makeEntry('Dexter'),
      makeEntry('PayAI')
    ])

    const paymentPayload = { x402Version: 2 }
    const paymentRequirements = { network: 'eip155:8453', scheme: 'exact' }

    const first = await uut.settle(paymentPayload, paymentRequirements)
    const second = await uut.settle(paymentPayload, paymentRequirements)
    const third = await uut.settle(paymentPayload, paymentRequirements)

    assert.equal(first.transaction, 'CDP-tx')
    assert.equal(second.transaction, 'Dexter-tx')
    assert.equal(third.transaction, 'PayAI-tx')
  })

  it('fails over when selected facilitator fails settle', async () => {
    let cdpCalls = 0
    const uut = new RoundRobinFacilitatorClient([
      makeEntry('CDP', {
        settle: async () => {
          cdpCalls++
          throw new Error('cdp settle failed')
        }
      }),
      makeEntry('Dexter'),
      makeEntry('PayAI')
    ])

    const paymentPayload = { x402Version: 2 }
    const paymentRequirements = { network: 'eip155:8453', scheme: 'exact' }

    const first = await uut.settle(paymentPayload, paymentRequirements)
    const second = await uut.settle(paymentPayload, paymentRequirements)

    assert.equal(cdpCalls, 1)
    assert.equal(first.transaction, 'Dexter-tx')
    assert.equal(second.transaction, 'PayAI-tx')
  })

  it('throws an aggregate error after all settle attempts fail', async () => {
    const uut = new RoundRobinFacilitatorClient([
      makeEntry('CDP', { settle: async () => { throw new Error('down') } }),
      makeEntry('Dexter', { settle: async () => { throw new Error('down') } })
    ])

    try {
      await uut.settle(
        { x402Version: 2 },
        { network: 'eip155:8453', scheme: 'exact' }
      )
      assert.fail('Expected settle() to throw')
    } catch (err) {
      assert.include(err.message, 'All facilitators failed settle()')
      assert.include(err.message, 'CDP')
      assert.include(err.message, 'Dexter')
    }
  })

  it('uses precedence/fallback behavior for verify', async () => {
    let cdpCalls = 0
    let dexterCalls = 0
    const uut = new RoundRobinFacilitatorClient([
      makeEntry('CDP', {
        verify: async () => {
          cdpCalls++
          throw new Error('bad verify')
        }
      }),
      makeEntry('Dexter', {
        verify: async () => {
          dexterCalls++
          return { isValid: true, payer: '0x123' }
        }
      })
    ])

    const result = await uut.verify(
      { x402Version: 2 },
      { network: 'eip155:8453', scheme: 'exact' }
    )

    assert.equal(cdpCalls, 1)
    assert.equal(dexterCalls, 1)
    assert.equal(result.payer, '0x123')
  })

  it('merges and deduplicates getSupported data', async () => {
    const uut = new RoundRobinFacilitatorClient([
      makeEntry('CDP', {
        getSupported: async () => ({
          kinds: [{ x402Version: 2, network: 'eip155:8453', scheme: 'exact' }],
          extensions: [{ key: 'bazaar' }],
          signers: { 'eip155:8453': ['0xaaa'] }
        })
      }),
      makeEntry('Dexter', {
        getSupported: async () => ({
          kinds: [
            { x402Version: 2, network: 'eip155:8453', scheme: 'exact' },
            { x402Version: 2, network: 'eip155:84532', scheme: 'exact' }
          ],
          extensions: [{ key: 'bazaar' }, { key: 'other' }],
          signers: { 'eip155:8453': ['0xaaa', '0xbbb'] }
        })
      })
    ])

    const supported = await uut.getSupported()
    assert.lengthOf(supported.kinds, 2)
    assert.lengthOf(supported.extensions, 2)
    assert.deepEqual(supported.signers['eip155:8453'], ['0xaaa', '0xbbb'])
  })
})
