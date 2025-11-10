/*
  REST API Controller for the /full-node/dsproof routes.
*/

import wlogger from '../../../../adapters/wlogger.js'

class DSProofRESTController {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating DSProof REST Controller.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases || !this.useCases.dsproof) {
      throw new Error(
        'Instance of DSProof use cases required when instantiating DSProof REST Controller.'
      )
    }

    this.dsproofUseCases = this.useCases.dsproof

    this.root = this.root.bind(this)
    this.getDSProof = this.getDSProof.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  /**
   * @api {get} /v6/full-node/dsproof/ Service status
   * @apiName DSProofRoot
   * @apiGroup DSProof
   *
   * @apiDescription Returns the status of the dsproof service.
   *
   * @apiSuccess {String} status Service identifier
   */
  async root (req, res) {
    return res.status(200).json({ status: 'dsproof' })
  }

  /**
   * @api {get} /v6/full-node/dsproof/getDSProof/:txid Get Double-Spend Proof
   * @apiName GetDSProof
   * @apiGroup DSProof
   * @apiDescription Get information for a double-spend proof.
   *
   * @apiParam {String} txid Transaction ID
   * @apiParam {String} verbose Verbose level (`false`, `true`) for compatibility with legacy API
   */
  async getDSProof (req, res) {
    try {
      const txid = req.params.txid

      if (!txid) {
        return res.status(400).json({
          success: false,
          error: 'txid can not be empty'
        })
      }

      if (txid.length !== 64) {
        return res.status(400).json({
          success: false,
          error: `txid must be of length 64 (not ${txid.length})`
        })
      }

      let verbose = 2
      if (req.query.verbose === 'true') verbose = 3

      const result = await this.dsproofUseCases.getDSProof({ txid, verbose })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  handleError (err, res) {
    wlogger.error('Error in DSProofRESTController:', err)

    const status = err.status || 500
    const message = err.message || 'Internal server error'

    return res.status(status).json({ error: message })
  }
}

export default DSProofRESTController
