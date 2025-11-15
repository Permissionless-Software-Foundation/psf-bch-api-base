/*
  This is a top-level library that encapsulates all the additional Use Cases.
  The concept of Use Cases comes from Clean Architecture:
  https://troutsblog.com/blog/clean-architecture
*/

// Local libraries
import BlockchainUseCases from './full-node-blockchain-use-cases.js'
import ControlUseCases from './full-node-control-use-cases.js'
import DSProofUseCases from './full-node-dsproof-use-cases.js'
import FulcrumUseCases from './fulcrum-use-cases.js'
import MiningUseCases from './full-node-mining-use-cases.js'
import RawTransactionsUseCases from './full-node-rawtransactions-use-cases.js'

class UseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of adapters must be passed in when instantiating Use Cases library.'
      )
    }

    this.blockchain = new BlockchainUseCases({ adapters: this.adapters })
    this.control = new ControlUseCases({ adapters: this.adapters })
    this.dsproof = new DSProofUseCases({ adapters: this.adapters })
    this.fulcrum = new FulcrumUseCases({ adapters: this.adapters })
    this.mining = new MiningUseCases({ adapters: this.adapters })
    this.rawtransactions = new RawTransactionsUseCases({ adapters: this.adapters })
  }

  // Run any startup Use Cases at the start of the app.
  async start () {
    console.log('Use Cases have been started.')
    return true
  }
}

export default UseCases
