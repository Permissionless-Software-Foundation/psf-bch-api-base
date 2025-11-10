/*
  This is a top-level library that encapsulates all the additional Use Cases.
  The concept of Use Cases comes from Clean Architecture:
  https://troutsblog.com/blog/clean-architecture
*/

// Local libraries
// import PublishEventUseCase from './publish-event.js'
// import QueryEventsUseCase from './query-events.js'
// import ManageSubscriptionUseCase from './manage-subscription.js'
import BlockchainUseCases from './blockchain/index.js'

class UseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of adapters must be passed in when instantiating Use Cases library.'
      )
    }

    // this.publishEvent = new PublishEventUseCase({ adapters: this.adapters })
    // this.queryEvents = new QueryEventsUseCase({ adapters: this.adapters })
    // this.manageSubscription = new ManageSubscriptionUseCase({ adapters: this.adapters })
    this.blockchain = new BlockchainUseCases({ adapters: this.adapters })
  }

  // Run any startup Use Cases at the start of the app.
  async start () {
    console.log('Use Cases have been started.')
    return true
  }
}

export default UseCases
