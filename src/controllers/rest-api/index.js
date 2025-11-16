/*
  This index file for the Clean Architecture Controllers loads dependencies,
  creates instances, and attaches the controller to REST API endpoints for
  Express.
*/

// Local libraries
// import EventRouter from './event/index.js'
// import ReqRouter from './req/index.js'
import BlockchainRouter from './full-node/blockchain/router.js'
import ControlRouter from './full-node/control/router.js'
import DSProofRouter from './full-node/dsproof/router.js'
import FulcrumRouter from './fulcrum/router.js'
import MiningRouter from './full-node/mining/router.js'
import RawTransactionsRouter from './full-node/rawtransactions/router.js'
import SlpRouter from './slp/router.js'
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

    // Allow overriding the API prefix for testing, default to v6.
    this.apiPrefix = localConfig.apiPrefix || '/v6'
    if (this.apiPrefix.length > 1 && this.apiPrefix.endsWith('/')) {
      this.apiPrefix = this.apiPrefix.slice(0, -1)
    }

    // Bind 'this' object to all subfunctions.
    this.attachRESTControllers = this.attachRESTControllers.bind(this)

    // Encapsulate dependencies
    this.config = config
  }

  attachRESTControllers (app) {
    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases,
      apiPrefix: this.apiPrefix
    }

    // Attach the REST API Controllers associated with the /event route
    // const eventRouter = new EventRouter(dependencies)
    // eventRouter.attach(app)

    // Attach the REST API Controllers associated with the /req route
    // const reqRouter = new ReqRouter(dependencies)
    // reqRouter.attach(app)

    const blockchainRouter = new BlockchainRouter(dependencies)
    blockchainRouter.attach(app)

    const controlRouter = new ControlRouter(dependencies)
    controlRouter.attach(app)

    const dsproofRouter = new DSProofRouter(dependencies)
    dsproofRouter.attach(app)

    const fulcrumRouter = new FulcrumRouter(dependencies)
    fulcrumRouter.attach(app)

    const miningRouter = new MiningRouter(dependencies)
    miningRouter.attach(app)

    const rawtransactionsRouter = new RawTransactionsRouter(dependencies)
    rawtransactionsRouter.attach(app)

    const slpRouter = new SlpRouter(dependencies)
    slpRouter.attach(app)
  }
}

export default RESTControllers
