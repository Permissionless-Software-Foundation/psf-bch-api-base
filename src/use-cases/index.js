/*
  This is a top-level library that encapsulates all the additional Use Cases.
  The concept of Use Cases comes from Clean Architecture:
  https://troutsblog.com/blog/clean-architecture
*/

// Local libraries
import BlockchainUseCases from './full-node-blockchain-use-cases.js'

class UseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of adapters must be passed in when instantiating Use Cases library.'
      )
    }

    this.blockchain = new BlockchainUseCases({ adapters: this.adapters })
  }

  // Run any startup Use Cases at the start of the app.
  async start () {
    console.log('Use Cases have been started.')
    return true
  }
}

export default UseCases
