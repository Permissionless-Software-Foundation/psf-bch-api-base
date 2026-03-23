import axios from 'axios'
import { withPaymentInterceptor } from 'x402-axios'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
// import { baseSepolia } from 'viem/chains' // Testnet

import { createWalletClient, http } from 'viem'

// const baseURL = 'http://localhost:5942' // Local
const baseURL = 'https://x402.fullstack.cash' // Production

const endpointPath = '/v6/full-node/blockchain/getBlockchainInfo'
const pKey = process.env.PRIVATE_KEY || ''

// PRIVATE_KEY=0x... node examples/02-x402-dexter-client.js
if (!pKey) throw new Error('PRIVATE_KEY env required!')

console.log('Using Dexter facilitator - no API keys required!')

// Create a wallet client
const account = privateKeyToAccount(pKey)
const client = createWalletClient({
  account,
  transport: http(),
  chain: base
})

// Configure axios to use Dexter facilitator
// Dexter uses the same x402 protocol but with no API key requirement
const api = withPaymentInterceptor(
  axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'X-Facilitator': 'dexter' // Optional hint for server
    }
  }),
  client,
  {
    // Dexter facilitator URL (for client-side settlement)
    facilitatorUrl: 'https://dexter.cash/facilitator'
  }
)

const request = async () => {
  console.log('\n\nStep 1: Making first call, expecting a 402 error returned.')
  try {
    const response = await axios.get(baseURL + endpointPath)
    console.log(response.data)
    console.log('Step 1 failed. Expected a 402 error.')
  } catch (err) {
    console.log(`Status code: ${err?.response?.status}`)
    console.log(`Error data: ${JSON.stringify(err.response.data, null, 2)}`)
    console.log('\n\n')
  }

  console.log('\n\nStep 2: Making second call with Dexter payment.')
  console.log('Dexter facilitator: https://dexter.cash/facilitator')
  console.log('Features: No API keys, gas sponsored, 600K+ free tx/month')

  try {
    // Call the same endpoint path with a payment via Dexter
    const paidRes = await api.get(endpointPath)
    console.log('Data returned after Dexter payment: ', paidRes.data)
  } catch (err) {
    console.log('Step 2 failed. Expected a 200 success status code.')
    console.log(`Status code: ${err?.response?.status}`)
    console.log(`Error data: ${JSON.stringify(err.response.data, null, 2)}`)

    process.exit(1)
  }
}

request()
