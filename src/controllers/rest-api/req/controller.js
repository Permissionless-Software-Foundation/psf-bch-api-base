/*
  REST API Controller library for the /req route
*/

// Local libraries
import wlogger from '../../../adapters/wlogger.js'

class ReqRESTControllerLib {
  constructor (localConfig = {}) {
    // Dependency Injection.
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating /req REST Controller.'
      )
    }
    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating /req REST Controller.'
      )
    }

    // Bind 'this' object to all subfunctions
    this.queryEvents = this.queryEvents.bind(this)
    this.createSubscription = this.createSubscription.bind(this)
    this.closeSubscription = this.closeSubscription.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  /**
   * @api {get} /req/:subId Query events (stateless)
   * @apiPermission public
   * @apiName QueryEvents
   * @apiGroup Request
   *
   * @apiDescription Query events from the relay with filters. Returns events immediately. Maps to: ["REQ", <sub_id>, <filters>]
   *
   * @apiParam {String} subId Subscription ID (unique identifier)
   * @apiParam {String} filters JSON-encoded filters object (query parameter)
   *
   * @apiExample {curl} Example usage:
   * curl -X GET "http://localhost:3000/req/sub1?filters=[{\"kinds\":[1],\"limit\":10}]"
   *
   * @apiSuccess {Array} events Array of Nostr events
   *
   * @apiError {String} error Error message
   */
  async queryEvents (req, res) {
    try {
      const { subId } = req.params
      let filters = req.query.filters

      if (!subId) {
        return res.status(400).json({
          error: 'Subscription ID is required'
        })
      }

      // Parse filters from query string
      if (typeof filters === 'string') {
        try {
          filters = JSON.parse(filters)
        } catch (err) {
          return res.status(400).json({
            error: 'Invalid filters JSON'
          })
        }
      } else if (!filters) {
        // If no filters provided, accept filters from query params
        filters = {}
        if (req.query.kinds) {
          filters.kinds = JSON.parse(req.query.kinds)
        }
        if (req.query.authors) {
          filters.authors = JSON.parse(req.query.authors)
        }
        if (req.query.ids) {
          filters.ids = JSON.parse(req.query.ids)
        }
        if (req.query.limit) {
          filters.limit = parseInt(req.query.limit)
        }
        if (req.query.since) {
          filters.since = parseInt(req.query.since)
        }
        if (req.query.until) {
          filters.until = parseInt(req.query.until)
        }
      }

      // Ensure filters is an array (Nostr protocol expects array of filters)
      const filtersArray = Array.isArray(filters) ? filters : [filters]

      const events = await this.useCases.queryEvents.execute(filtersArray, subId)

      return res.status(200).json(events)
    } catch (err) {
      return this.handleError(err, req, res)
    }
  }

  /**
   * @api {post} /req/:subId Create subscription (SSE)
   * @apiPermission public
   * @apiName CreateSubscription
   * @apiGroup Request
   *
   * @apiDescription Create a subscription for Server-Sent Events. Maps to: ["REQ", <sub_id>, <filters>]
   *
   * @apiParam {String} subId Subscription ID (unique identifier)
   * @apiParam {Object} filters Filters object in request body
   *
   * @apiExample {json} Example usage:
   * {
   *   "kinds": [1],
   *   "authors": ["2c7e76c0f8dc1dca9d0197c7d19be580a8d074ccada6a2f6ebe056ae41092e9"]
   * }
   *
   * @apiSuccess {String} message Success message
   *
   * @apiError {String} error Error message
   */
  async createSubscription (req, res) {
    try {
      const { subId } = req.params
      const filters = req.body

      if (!subId) {
        return res.status(400).json({
          error: 'Subscription ID is required'
        })
      }

      if (!filters || (typeof filters === 'object' && Object.keys(filters).length === 0)) {
        return res.status(400).json({
          error: 'Filters are required'
        })
      }

      // Ensure filters is an array
      const filtersArray = Array.isArray(filters) ? filters : [filters]

      // Set up Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no') // Disable buffering in nginx

      // Track if response is still writable
      let isResponseWritable = true

      // Helper function to safely write to SSE stream
      const safeWrite = (data) => {
        if (!isResponseWritable) {
          return false
        }
        try {
          if (!res.writable || res.destroyed || res.closed) {
            isResponseWritable = false
            return false
          }
          return res.write(data)
        } catch (err) {
          wlogger.warn(`Error writing to SSE stream for subscription ${subId}:`, err.message)
          isResponseWritable = false
          return false
        }
      }

      // Handle response stream errors
      res.on('error', (err) => {
        wlogger.warn(`Response stream error for subscription ${subId}:`, err.message)
        isResponseWritable = false
        // Clean up subscription on stream error
        this.useCases.manageSubscription.closeSubscription(subId).catch(closeErr => {
          wlogger.error('Error closing subscription on stream error:', closeErr)
        })
      })

      // Send initial connection message
      if (!safeWrite(`data: ${JSON.stringify({ type: 'connected', subscriptionId: subId })}\n\n`)) {
        wlogger.warn(`Failed to send initial connection message for subscription ${subId}`)
        return res.status(500).json({ error: 'Failed to establish SSE connection' })
      }

      // Handle events
      const onEvent = (event) => {
        if (!safeWrite(`data: ${JSON.stringify({ type: 'event', data: event })}\n\n`)) {
          wlogger.debug(`Cannot write event to SSE stream for subscription ${subId} - connection may be closed`)
        }
      }

      // Handle EOSE
      const onEose = () => {
        if (!safeWrite(`data: ${JSON.stringify({ type: 'eose' })}\n\n`)) {
          wlogger.debug(`Cannot write EOSE to SSE stream for subscription ${subId} - connection may be closed`)
        }
      }

      // Handle CLOSED
      const onClosed = (message) => {
        if (safeWrite(`data: ${JSON.stringify({ type: 'closed', message })}\n\n`)) {
          try {
            if (!res.destroyed && !res.closed) {
              res.end()
            }
          } catch (err) {
            wlogger.warn(`Error ending SSE stream for subscription ${subId}:`, err.message)
          }
        }
        isResponseWritable = false
      }

      // Create subscription
      await this.useCases.manageSubscription.createSubscription(
        subId,
        filtersArray,
        onEvent,
        onEose,
        onClosed
      )

      // Handle client disconnect
      req.on('close', () => {
        wlogger.info(`Client disconnected from subscription ${subId}`)
        isResponseWritable = false
        this.useCases.manageSubscription.closeSubscription(subId).catch(err => {
          wlogger.error('Error closing subscription on disconnect:', err)
        })
      })

      // Handle response finish
      res.on('finish', () => {
        isResponseWritable = false
      })
    } catch (err) {
      return this.handleError(err, req, res)
    }
  }

  /**
   * @api {put} /req/:subId Create subscription (SSE) - alternative method
   * @apiPermission public
   * @apiName CreateSubscriptionPut
   * @apiGroup Request
   *
   * @apiDescription Same as POST /req/:subId - create a subscription for Server-Sent Events
   */
  async createSubscriptionPut (req, res) {
    return this.createSubscription(req, res)
  }

  /**
   * @api {delete} /req/:subId Close subscription
   * @apiPermission public
   * @apiName CloseSubscription
   * @apiGroup Request
   *
   * @apiDescription Close an existing subscription. Maps to: ["CLOSE", <sub_id>]
   *
   * @apiParam {String} subId Subscription ID to close
   *
   * @apiSuccess {String} message Success message
   *
   * @apiError {String} error Error message
   */
  async closeSubscription (req, res) {
    try {
      const { subId } = req.params

      if (!subId) {
        return res.status(400).json({
          error: 'Subscription ID is required'
        })
      }

      await this.useCases.manageSubscription.closeSubscription(subId)

      return res.status(200).json({
        message: `Subscription ${subId} closed successfully`
      })
    } catch (err) {
      return this.handleError(err, req, res)
    }
  }

  handleError (err, req, res) {
    wlogger.error('Error in ReqRESTController:', err)
    return res.status(500).json({
      error: err.message || 'Internal server error'
    })
  }
}

export default ReqRESTControllerLib
