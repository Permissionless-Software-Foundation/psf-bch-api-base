/*
  REST API Controller library for the /event route
*/

// Local libraries
import wlogger from '../../../adapters/wlogger.js'

class EventRESTControllerLib {
  constructor (localConfig = {}) {
    // Dependency Injection.
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating /event REST Controller.'
      )
    }
    this.useCases = localConfig.useCases
    if (!this.useCases) {
      throw new Error(
        'Instance of Use Cases library required when instantiating /event REST Controller.'
      )
    }

    // Bind 'this' object to all subfunctions
    this.publishEvent = this.publishEvent.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  /**
   * @api {post} /event Publish a Nostr event
   * @apiPermission public
   * @apiName PublishEvent
   * @apiGroup Event
   *
   * @apiDescription Publish a signed Nostr event to the relay. Maps to the Nostr WebSocket protocol message: ["EVENT", <event>]
   *
   * @apiParam {String} id Event ID (32-bytes lowercase hex-encoded sha256)
   * @apiParam {String} pubkey Public key of event creator (32-bytes lowercase hex-encoded)
   * @apiParam {Number} created_at Unix timestamp in seconds
   * @apiParam {Number} kind Integer between 0 and 65535
   * @apiParam {Array} tags Array of tag arrays
   * @apiParam {String} content Event content (arbitrary string)
   * @apiParam {String} sig Signature (64-bytes lowercase hex)
   *
   * @apiExample {json} Example usage:
   * {
   *   "id": "5c83da77af1dec6d7289834998ad7aafbd9e2191396d75ec3cc27f5a77226f36",
   *   "pubkey": "2c7e76c0f8dc1dca9d0197c7d19be580a8d074ccada6a2f6ebe056ae41092e9",
   *   "created_at": 1672531200,
   *   "kind": 1,
   *   "tags": [],
   *   "content": "Hello, Nostr!",
   *   "sig": "abc123..."
   * }
   *
   * @apiSuccess {Boolean} accepted Whether the event was accepted by the relay
   * @apiSuccess {String} message Optional message from the relay
   * @apiSuccess {String} eventId The event ID
   *
   * @apiError {String} error Error message
   */
  async publishEvent (req, res) {
    try {
      const eventData = req.body

      // Check if eventData is missing or empty
      if (!eventData || (typeof eventData === 'object' && Object.keys(eventData).length === 0)) {
        return res.status(400).json({
          error: 'Event data is required'
        })
      }

      const result = await this.useCases.publishEvent.execute(eventData)

      if (result.accepted) {
        return res.status(200).json(result)
      } else {
        return res.status(400).json(result)
      }
    } catch (err) {
      return this.handleError(err, req, res)
    }
  }

  handleError (err, req, res) {
    wlogger.error('Error in EventRESTController:', err)

    // Return 400 for validation errors, 500 for other errors
    // Validation errors indicate the client sent bad data
    const isValidationError = err.message && err.message.includes('Invalid event structure')
    const statusCode = isValidationError ? 400 : 500

    return res.status(statusCode).json({
      error: err.message || 'Internal server error'
    })
  }
}

export default EventRESTControllerLib
