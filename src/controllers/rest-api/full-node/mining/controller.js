/*
  REST API Controller for the /full-node/mining routes.
*/

import wlogger from '../../../../adapters/wlogger.js'

class MiningRESTController {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Mining REST Controller.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases || !this.useCases.mining) {
      throw new Error(
        'Instance of Mining use cases required when instantiating Mining REST Controller.'
      )
    }

    this.miningUseCases = this.useCases.mining

    // Bind functions
    this.root = this.root.bind(this)
    this.getMiningInfo = this.getMiningInfo.bind(this)
    this.getNetworkHashPS = this.getNetworkHashPS.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  /**
   * @api {get} /v6/full-node/mining/ Service status
   * @apiName MiningRoot
   * @apiGroup Mining
   *
   * @apiDescription Returns the status of the mining service.
   *
   * @apiSuccess {String} status Service identifier
   */
  async root (req, res) {
    return res.status(200).json({ status: 'mining' })
  }

  /**
   * @api {get} /v6/full-node/mining/getMiningInfo Get Mining Info
   * @apiName GetMiningInfo
   * @apiGroup Mining
   * @apiDescription Returns a json object containing mining-related information.
   *
   * @apiExample Example usage:
   * curl -X GET "https://api.fullstack.cash/v6/full-node/mining/getMiningInfo" -H "accept: application/json"
   */
  async getMiningInfo (req, res) {
    try {
      const result = await this.miningUseCases.getMiningInfo()
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/mining/getNetworkHashPS Get Estimated network hashes per second
   * @apiName GetNetworkHashPS
   * @apiGroup Mining
   * @apiDescription Returns the estimated network hashes per second based on the last n blocks. Pass in [nblocks] to override # of blocks, -1 specifies since last difficulty change. Pass in [height] to estimate the network speed at the time when a certain block was found.
   *
   * @apiParam {Number} nblocks Number of blocks to use for estimation (default: 120)
   * @apiParam {Number} height Block height to estimate at (default: -1)
   *
   * @apiExample Example usage:
   * curl -X GET "https://api.fullstack.cash/v6/full-node/mining/getNetworkHashPS?nblocks=120&height=-1" -H "accept: application/json"
   */
  async getNetworkHashPS (req, res) {
    try {
      let nblocks = 120 // Default
      let height = -1 // Default
      if (req.query.nblocks) nblocks = parseInt(req.query.nblocks)
      if (req.query.height) height = parseInt(req.query.height)

      const result = await this.miningUseCases.getNetworkHashPS({ nblocks, height })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  handleError (err, res) {
    wlogger.error('Error in MiningRESTController:', err)

    const status = err.status || 500
    const message = err.message || 'Internal server error'

    return res.status(status).json({ error: message })
  }
}

export default MiningRESTController
