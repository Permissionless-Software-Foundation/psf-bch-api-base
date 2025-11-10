/*
  REST API library for the /event route.
*/

// Public npm libraries.
import express from 'express'

// Local libraries.
import EventRESTControllerLib from './controller.js'

class EventRouter {
  constructor (localConfig = {}) {
    // Dependency Injection.
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Event REST Controller.'
      )
    }
    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating Event REST Controller.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    // Encapsulate dependencies.
    this.eventRESTController = new EventRESTControllerLib(dependencies)

    // Instantiate the router and set the base route.
    this.baseUrl = '/event'
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error(
        'Must pass app object when attaching REST API controllers.'
      )
    }

    // Define the routes and attach the controller.
    this.router.post('/', this.eventRESTController.publishEvent)

    // Attach the Controller routes to the Express app.
    app.use(this.baseUrl, this.router)
  }
}

export default EventRouter
