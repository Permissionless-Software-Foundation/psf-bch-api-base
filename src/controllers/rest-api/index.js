/*
  This index file for the Clean Architecture Controllers loads dependencies,
  creates instances, and attaches the controller to REST API endpoints for
  Express.
*/

// Local libraries
// import EventRouter from './event/index.js'
// import ReqRouter from './req/index.js'
import BlockchainRouter from './full-node/blockchain/index.js'
import config from '../../config/index.js'

class RESTControllers {
  constructor (localConfig = {}) {
    // Dependency Injection.
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating REST Controller libraries.'
      )
    }
    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating REST Controller libraries.'
      )
    }

    // Bind 'this' object to all subfunctions.
    this.attachRESTControllers = this.attachRESTControllers.bind(this)

    // Encapsulate dependencies
    this.config = config
  }

  attachRESTControllers (app) {
    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    // Attach the REST API Controllers associated with the /event route
    // const eventRouter = new EventRouter(dependencies)
    // eventRouter.attach(app)

    // Attach the REST API Controllers associated with the /req route
    // const reqRouter = new ReqRouter(dependencies)
    // reqRouter.attach(app)

    const blockchainRouter = new BlockchainRouter(dependencies)
    blockchainRouter.attach(app)
  }
}

export default RESTControllers
