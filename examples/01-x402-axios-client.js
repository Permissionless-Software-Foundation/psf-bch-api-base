/**
 * x402 v2 axios example — USDC on Base (CAIP-2). Run from repo root:
 *   `node examples/01-x402-axios-client.js`
 * The x402 stack pulls in `siwe`, which expects `ethers` as a peer — it is listed in package.json.
 *
 * Uses `toClientEvmSigner(account, publicClient)` so the signer has `readContract` (required by
 * @x402/evm ClientEvmSigner). Optional: `BASE_RPC_URL` for Base / Base Sepolia HTTP RPC.
 */
import axios, { AxiosHeaders } from 'axios'

import { createPublicClient, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { x402Client, wrapAxiosWithPayment } from '@x402/axios'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { toClientEvmSigner } from '@x402/evm'

const baseURL = 'http://localhost:5942' // Local
// const baseURL = 'https://x402.fullstack.cash' // Production

const endpointPath = '/v6/full-node/blockchain/getBlockchainInfo'
const pKey = process.env.PRIVATE_KEY || process.env.EVM_PRIVATE_KEY || ''

const x402Network = 'eip155:8453' // sepolia eip155:84532

if (!pKey) throw new Error('PRIVATE_KEY or EVM_PRIVATE_KEY env required!')

const account = privateKeyToAccount(pKey)
const chain = x402Network === 'eip155:84532' ? baseSepolia : base
const defaultRpc =
  x402Network === 'eip155:84532'
    ? 'https://sepolia.base.org'
    : 'https://mainnet.base.org'
const publicClient = createPublicClient({
  chain,
  transport: http(process.env.BASE_RPC_URL || defaultRpc)
})
const signer = toClientEvmSigner(account, publicClient)

// eslint-disable-next-line new-cap
const client = new x402Client()
registerExactEvmScheme(client, {
  signer,
  networks: [x402Network]
})

const api = wrapAxiosWithPayment(
  axios.create({
    baseURL,
    headers: new AxiosHeaders({
      'Content-Type': 'application/json'
    })
  }),
  client
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
    console.log(
      `Error StatusText: ${JSON.stringify(err.response.statusText, null, 2)}`
    )

    console.log('\n\n')
  }

  console.log('\n\nStep 2: Making second call with a payment.')

  try {
    // Call the same endpoint path with a payment.
    const paidRes = await api.get(endpointPath)
    console.log('Data returned after payment: ', paidRes.data)
  } catch (err) {
    console.log('Step 2 failed. Expected a 200 success status code.')
    console.log(`Status code: ${err?.response?.status}`)
    console.log(
      `Error StatusText: ${JSON.stringify(err.response.statusText, null, 2)}`
    )
    console.log(`Error data: ${JSON.stringify(err.response.data, null, 2)}`)

    process.exit(1)
  }
}

request()
