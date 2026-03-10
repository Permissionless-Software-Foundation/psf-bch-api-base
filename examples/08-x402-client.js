import axios from 'axios'
import { withPaymentInterceptor } from 'x402-axios'
import { mnemonicToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { createWalletClient, http } from 'viem'

const baseURL = 'http://localhost:5942'
const endpointPath = '/v6/full-node/blockchain/getBlockchainInfo'
const mnemonic = process.env.MNEMONIC || ''

if (!mnemonic) throw new Error('MNEMONIC env required!')

// Create a wallet client
const account = mnemonicToAccount(mnemonic)
const client = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia
})

const api = withPaymentInterceptor(
  axios.create({
    baseURL
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
    console.log(`Error data: ${JSON.stringify(err.response.data, null, 2)}`)

    process.exit(1)
  }
}

request()
