/*
  REST API Controller for the /encryption routes.
*/

import wlogger from '../../../adapters/wlogger.js'

class EncryptionRESTController {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Encryption REST Controller.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases || !this.useCases.encryption) {
      throw new Error(
        'Instance of Encryption use cases required when instantiating Encryption REST Controller.'
      )
    }

    this.encryptionUseCases = this.useCases.encryption

    // Bind functions
    this.root = this.root.bind(this)
    this.getPublicKey = this.getPublicKey.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  /**
   * @api {get} /v6/encryption/ Service status
   * @apiName EncryptionRoot
   * @apiGroup Encryption
   *
   * @apiDescription Returns the status of the encryption service.
   *
   * @apiSuccess {String} status Service identifier
   */
  async root (req, res) {
    return res.status(200).json({ status: 'encryption' })
  }

  /**
   * @api {get} /v6/encryption/publickey/:address Get public key for a BCH address
   * @apiName GetPublicKey
   * @apiGroup Encryption
   * @apiDescription Searches the blockchain for a public key associated with a
   * BCH address. Returns an object. If successful, the publicKey property will
   * contain a hexadecimal representation of the public key.
   *
   * @apiParam {String} address BCH address (cash address or legacy format)
   *
   * @apiExample Example usage:
   * curl -X GET "https://api.fullstack.cash/v6/encryption/publickey/bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf" -H "accept: application/json"
   *
   * @apiSuccess {Boolean} success Indicates if the operation was successful
   * @apiSuccess {String} publicKey The public key in hexadecimal format, or "not found"
   */
  async getPublicKey (req, res) {
    try {
      const address = req.params.address

      // Reject if address is an array
      if (Array.isArray(address)) {
        res.status(400)
        return res.json({
          success: false,
          error: 'address can not be an array.'
        })
      }

      // Reject if address is missing
      if (!address) {
        res.status(400)
        return res.json({
          success: false,
          error: 'address is required.'
        })
      }

      const result = await this.encryptionUseCases.getPublicKey({ address })

      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  handleError (err, res) {
    wlogger.error('Error in EncryptionRESTController:', err)

    const status = err.status || 500
    const message = err.message || 'Internal server error'

    return res.status(status).json({ success: false, error: message })
  }
}

export default EncryptionRESTController
