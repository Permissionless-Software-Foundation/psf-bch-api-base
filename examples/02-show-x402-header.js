/**
 * x402 v2 — fetch a protected URL like curl -i, then decode PAYMENT-REQUIRED.
 * Run from repo root:
 *   `node examples/02-show-x402-header.js`
 * Optional: `X402_SAMPLE_URL=https://host/path node examples/02-show-x402-header.js`
 */
import axios from 'axios'
import { decodePaymentRequiredHeader } from '@x402/core/http'

const url =
  process.env.X402_SAMPLE_URL ||
  'https://x402.fullstack.cash/v6/full-node/blockchain/getBlockchainInfo'

function headerString (headers, name) {
  const lower = name.toLowerCase()
  const raw =
    headers?.[lower] ??
    headers?.[name] ??
    (typeof headers?.get === 'function'
      ? headers.get(lower) ?? headers.get(name)
      : undefined)
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined
}

async function main () {
  const res = await axios.get(url, {
    validateStatus: () => true
  })

  console.log(`HTTP ${res.status}`)
  console.log(`content-type: ${headerString(res.headers, 'content-type') ?? '(none)'}`)
  console.log(
    `access-control-expose-headers: ${headerString(res.headers, 'access-control-expose-headers') ?? '(none)'}`
  )

  const paymentRequiredRaw = headerString(res.headers, 'payment-required')
  if (!paymentRequiredRaw) {
    console.error('\nNo PAYMENT-REQUIRED header on this response.')
    process.exit(1)
  }

  console.log('\n--- PAYMENT-REQUIRED (decoded) ---\n')
  try {
    const decoded = decodePaymentRequiredHeader(paymentRequiredRaw)
    console.log(JSON.stringify(decoded, null, 2))
  } catch (err) {
    console.error('\nFailed to decode PAYMENT-REQUIRED:', err?.message || err)
    process.exit(1)
  }

  console.log('\n--- response body ---\n')
  const body = res.data
  console.log(
    typeof body === 'string' ? body : JSON.stringify(body, null, 2)
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
