/*
  REST API Controller for the /full-node/control routes.
*/

import wlogger from '../../../../adapters/wlogger.js'

class ControlRESTController {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Control REST Controller.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases || !this.useCases.control) {
      throw new Error(
        'Instance of Control use cases required when instantiating Control REST Controller.'
      )
    }

    this.controlUseCases = this.useCases.control

    this.root = this.root.bind(this)
    this.getNetworkInfo = this.getNetworkInfo.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  /**
   * @api {get} /v6/full-node/control/ Service status
   * @apiName ControlRoot
   * @apiGroup Control
   *
   * @apiDescription Returns the status of the control service.
   *
   * @apiSuccess {String} status Service identifier
   */
  async root (req, res) {
    return res.status(200).json({ status: 'control' })
  }

  /**
   * @api {get} /v6/full-node/control/getNetworkInfo Get Network Info
   * @apiName GetNetworkInfo
   * @apiGroup Control
   * @apiDescription RPC call that gets basic full node information.
   */
  async getNetworkInfo (req, res) {
    try {
      const result = await this.controlUseCases.getNetworkInfo()
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  handleError (err, res) {
    wlogger.error('Error in ControlRESTController:', err)

    const status = err.status || 500
    const message = err.message || 'Internal server error'

    return res.status(status).json({ error: message })
  }
}

export default ControlRESTController
