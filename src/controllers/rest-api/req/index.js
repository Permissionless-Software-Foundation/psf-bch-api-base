/*
  REST API library for the /req route.
*/

// Public npm libraries.
import express from 'express'

// Local libraries.
import ReqRESTControllerLib from './controller.js'

class ReqRouter {
  constructor (localConfig = {}) {
    // Dependency Injection.
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Req REST Controller.'
      )
    }
    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating Req REST Controller.'
      )
    }

    const dependencies = {
      adapters: this.adapters,
      useCases: this.useCases
    }

    // Encapsulate dependencies.
    this.reqRESTController = new ReqRESTControllerLib(dependencies)

    // Instantiate the router and set the base route.
    this.router = express.Router()
  }

  attach (app) {
    if (!app) {
      throw new Error(
        'Must pass app object when attaching REST API controllers.'
      )
    }

    // Define the routes and attach the controller.
    // Handle empty subId case first
    this.router.get('/', (req, res) => {
      res.status(400).json({
        error: 'Subscription ID is required'
      })
    })
    this.router.post('/', (req, res) => {
      res.status(400).json({
        error: 'Subscription ID is required'
      })
    })
    this.router.delete('/', (req, res) => {
      res.status(400).json({
        error: 'Subscription ID is required'
      })
    })

    // Routes with subId parameter
    this.router.get('/:subId', this.reqRESTController.queryEvents)
    this.router.post('/:subId', this.reqRESTController.createSubscription)
    this.router.put('/:subId', this.reqRESTController.createSubscriptionPut)
    this.router.delete('/:subId', this.reqRESTController.closeSubscription)

    // Attach the Controller routes to the Express app.
    app.use('/req', this.router)
  }
}

export default ReqRouter
