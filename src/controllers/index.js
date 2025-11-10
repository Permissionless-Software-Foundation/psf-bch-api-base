/*
  This is a top-level library that encapsulates all the additional Controllers.
  The concept of Controllers comes from Clean Architecture:
  https://troutsblog.com/blog/clean-architecture
*/

// Local libraries
import Adapters from '../adapters/index.js'
import UseCases from '../use-cases/index.js'
import RESTControllers from './rest-api/index.js'
import TimerController from './timer-controller.js'
import config from '../config/index.js'

class Controllers {
  constructor (localConfig = {}) {
    // Encapsulate dependencies
    this.adapters = new Adapters(localConfig)
    this.useCases = new UseCases({ adapters: this.adapters })
    this.config = config
    this.timerController = new TimerController({ adapters: this.adapters, useCases: this.useCases })

    // Bind 'this' object to all subfunctions
    this.initAdapters = this.initAdapters.bind(this)
    this.initUseCases = this.initUseCases.bind(this)
    this.attachRESTControllers = this.attachRESTControllers.bind(this)
  }

  // Spin up any adapter libraries that have async startup needs.
  async initAdapters () {
    await this.adapters.start()
  }

  // Run any Use Cases to startup the app.
  async initUseCases () {
    await this.useCases.start()
  }

  // Initialize all the controllers.
  async initControllers () {
    this.timerController.startTimerControllers()
  }

  // Top-level function for this library.
  // Start the various Controllers and attach them to the app.
  attachRESTControllers (app) {
    const restControllers = new RESTControllers({
      adapters: this.adapters,
      useCases: this.useCases
    })

    // Attach the REST API Controllers to the Express app.
    restControllers.attachRESTControllers(app)
  }
}

export default Controllers
