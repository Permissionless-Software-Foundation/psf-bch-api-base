/*
  REST API Controller for the /full-node/rawtransactions routes.
*/

import wlogger from '../../../../adapters/wlogger.js'

class RawTransactionsRESTController {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating RawTransactions REST Controller.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases || !this.useCases.rawtransactions) {
      throw new Error(
        'Instance of RawTransactions use cases required when instantiating RawTransactions REST Controller.'
      )
    }

    this.rawtransactionsUseCases = this.useCases.rawtransactions

    // Bind functions
    this.root = this.root.bind(this)
    this.decodeRawTransactionSingle = this.decodeRawTransactionSingle.bind(this)
    this.decodeRawTransactionBulk = this.decodeRawTransactionBulk.bind(this)
    this.decodeScriptSingle = this.decodeScriptSingle.bind(this)
    this.decodeScriptBulk = this.decodeScriptBulk.bind(this)
    this.getRawTransactionSingle = this.getRawTransactionSingle.bind(this)
    this.getRawTransactionBulk = this.getRawTransactionBulk.bind(this)
    this.sendRawTransactionSingle = this.sendRawTransactionSingle.bind(this)
    this.sendRawTransactionBulk = this.sendRawTransactionBulk.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  /**
   * @api {get} /v6/full-node/rawtransactions/ Service status
   * @apiName RawTransactionsRoot
   * @apiGroup RawTransactions
   *
   * @apiDescription Returns the status of the rawtransactions service.
   *
   * @apiSuccess {String} status Service identifier
   */
  async root (req, res) {
    return res.status(200).json({ status: 'rawtransactions' })
  }

  /**
   * @api {get} /v6/full-node/rawtransactions/decodeRawTransaction/:hex Decode Single Raw Transaction
   * @apiName DecodeSingleRawTransaction
   * @apiGroup RawTransactions
   * @apiDescription Return a JSON object representing the serialized, hex-encoded transaction.
   *
   * @apiParam {String} hex Hex-encoded transaction
   *
   * @apiExample Example usage:
   * curl -X GET "https://api.fullstack.cash/v6/full-node/rawtransactions/decodeRawTransaction/02000000010e991f7ccec410f27d333f737f149b5d3be6728687da81072e638aed0063a176010000006b483045022100cd20443b0af090053450bc4ab00d563d4ac5955bb36e0135b00b8a96a19f233302205047f2c70a08c6ef4b76f2d198b33a31d17edfaa7e1e9e865894da0d396009354121024d4e7f522f67105b7bf5f9dbe557e7b2244613fdfcd6fe09304f93877328f6beffffffff02a0860100000000001976a9140ee020c07f39526ac5505c54fa1ab98490979b8388acb5f0f70b000000001976a9143a9b2b0c12fe722fcf653b6ef5dcc38732d6ff5188ac00000000" -H "accept: application/json"
   */
  async decodeRawTransactionSingle (req, res) {
    try {
      const hex = req.params.hex

      if (!hex || hex === '') {
        return res.status(400).json({ error: 'hex can not be empty' })
      }

      const result = await this.rawtransactionsUseCases.decodeRawTransaction({ hex })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {post} /v6/full-node/rawtransactions/decodeRawTransaction Decode Bulk Raw Transactions
   * @apiName DecodeBulkRawTransactions
   * @apiGroup RawTransactions
   * @apiDescription Return bulk hex encoded transaction.
   *
   * @apiParam {String[]} hexes Array of hex-encoded transactions
   *
   * @apiExample Example usage:
   * curl -X POST "https://api.fullstack.cash/v6/full-node/rawtransactions/decodeRawTransaction" -H "accept: application/json" -H "Content-Type: application/json" -d '{"hexes":["01000000013ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a000000006a4730440220540986d1c58d6e76f8f05501c520c38ce55393d0ed7ed3c3a82c69af04221232022058ea43ed6c05fec0eccce749a63332ed4525460105346f11108b9c26df93cd72012103083dfc5a0254613941ddc91af39ff90cd711cdcde03a87b144b883b524660c39ffffffff01807c814a000000001976a914d7e7c4e0b70eaa67ceff9d2823d1bbb9f6df9a5188ac00000000"]}'
   */
  async decodeRawTransactionBulk (req, res) {
    try {
      const hexes = req.body.hexes

      if (!Array.isArray(hexes)) {
        return res.status(400).json({ error: 'hexes must be an array' })
      }

      if (!this.adapters.fullNode.validateArraySize(hexes.length)) {
        return res.status(400).json({ error: 'Array too large.' })
      }

      // Validate each element in the array
      for (const hex of hexes) {
        if (!hex || hex === '') {
          return res.status(400).json({ error: 'Encountered empty hex' })
        }
      }

      const result = await this.rawtransactionsUseCases.decodeRawTransactions({ hexes })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/rawtransactions/decodeScript/:hex Decode Single Script
   * @apiName DecodeSingleScript
   * @apiGroup RawTransactions
   * @apiDescription Decode a hex-encoded script.
   *
   * @apiParam {String} hex Hex-encoded script
   *
   * @apiExample Example usage:
   * curl -X GET "https://api.fullstack.cash/v6/full-node/rawtransactions/decodeScript/4830450221009a51e00ec3524a7389592bc27bea4af5104a59510f5f0cfafa64bbd5c164ca2e02206c2a8bbb47eabdeed52f17d7df668d521600286406930426e3a9415fe10ed592012102e6e1423f7abde8b70bca3e78a7d030e5efabd3eb35c19302542b5fe7879c1a16" -H "accept: application/json"
   */
  async decodeScriptSingle (req, res) {
    try {
      const hex = req.params.hex

      if (!hex || hex === '') {
        return res.status(400).json({ error: 'hex can not be empty' })
      }

      const result = await this.rawtransactionsUseCases.decodeScript({ hex })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {post} /v6/full-node/rawtransactions/decodeScript Bulk Decode Script
   * @apiName DecodeBulkScript
   * @apiGroup RawTransactions
   * @apiDescription Decode multiple hex-encoded scripts.
   *
   * @apiParam {String[]} hexes Array of hex-encoded scripts
   *
   * @apiExample Example usage:
   * curl -X POST "https://api.fullstack.cash/v6/full-node/rawtransactions/decodeScript" -H "accept: application/json" -H "Content-Type: application/json" -d '{"hexes":["01000000013ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a000000006a4730440220540986d1c58d6e76f8f05501c520c38ce55393d0ed7ed3c3a82c69af04221232022058ea43ed6c05fec0eccce749a63332ed4525460105346f11108b9c26df93cd72012103083dfc5a0254613941ddc91af39ff90cd711cdcde03a87b144b883b524660c39ffffffff01807c814a000000001976a914d7e7c4e0b70eaa67ceff9d2823d1bbb9f6df9a5188ac00000000"]}'
   */
  async decodeScriptBulk (req, res) {
    try {
      const hexes = req.body.hexes

      if (!Array.isArray(hexes)) {
        return res.status(400).json({ error: 'hexes must be an array' })
      }

      if (!this.adapters.fullNode.validateArraySize(hexes.length)) {
        return res.status(400).json({ error: 'Array too large.' })
      }

      // Validate each hex in the array
      for (const hex of hexes) {
        if (!hex || hex === '') {
          return res.status(400).json({ error: 'Encountered empty hex' })
        }
      }

      const result = await this.rawtransactionsUseCases.decodeScripts({ hexes })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/rawtransactions/getRawTransaction/:txid Get Raw Transaction
   * @apiName GetRawTransaction
   * @apiGroup RawTransactions
   * @apiDescription Return the raw transaction data. If verbose is 'true', returns an Object with information about 'txid'. If verbose is 'false' or omitted, returns a string that is serialized, hex-encoded data for 'txid'.
   *
   * @apiParam {String} txid Transaction ID
   * @apiParam {Boolean} verbose Return verbose data (default false)
   *
   * @apiExample Example usage:
   * curl -X GET "https://api.fullstack.cash/v6/full-node/rawtransactions/getRawTransaction/fe28050b93faea61fa88c4c630f0e1f0a1c24d0082dd0e10d369e13212128f33?verbose=true" -H "accept: application/json"
   */
  async getRawTransactionSingle (req, res) {
    try {
      const txid = req.params.txid
      const verbose = req.query.verbose === 'true'

      if (!txid || txid === '') {
        return res.status(400).json({ error: 'txid can not be empty' })
      }

      if (txid.length !== 64) {
        return res.status(400).json({
          error: `parameter 1 must be of length 64 (not ${txid.length})`
        })
      }

      const result = await this.rawtransactionsUseCases.getRawTransactionWithHeight({ txid, verbose })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {post} /v6/full-node/rawtransactions/getRawTransaction Get Bulk Raw Transactions
   * @apiName GetBulkRawTransactions
   * @apiGroup RawTransactions
   * @apiDescription Return the raw transaction data for multiple transactions. If verbose is 'true', returns an Object with information about 'txid'. If verbose is 'false' or omitted, returns a string that is serialized, hex-encoded data for 'txid'.
   *
   * @apiParam {String[]} txids Array of transaction IDs
   * @apiParam {Boolean} verbose Return verbose data (default false)
   *
   * @apiExample Example usage:
   * curl -X POST "https://api.fullstack.cash/v6/full-node/rawtransactions/getRawTransaction" -H "accept: application/json" -H "Content-Type: application/json" -d '{"txids":["a5f972572ee1753e2fd2457dd61ce5f40fa2f8a30173d417e49feef7542c96a1","5165dc531aad05d1149bb0f0d9b7bda99c73e2f05e314bcfb5b4bb9ca5e1af5e"],"verbose":true}'
   */
  async getRawTransactionBulk (req, res) {
    try {
      const txids = req.body.txids
      const verbose = !!req.body.verbose

      if (!Array.isArray(txids)) {
        return res.status(400).json({ error: 'txids must be an array' })
      }

      if (!this.adapters.fullNode.validateArraySize(txids.length)) {
        return res.status(400).json({ error: 'Array too large.' })
      }

      // Validate each txid in the array
      for (const txid of txids) {
        if (!txid || txid === '') {
          return res.status(400).json({ error: 'Encountered empty TXID' })
        }

        if (txid.length !== 64) {
          return res.status(400).json({
            error: `parameter 1 must be of length 64 (not ${txid.length})`
          })
        }
      }

      const result = await this.rawtransactionsUseCases.getRawTransactions({ txids, verbose })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/rawtransactions/sendRawTransaction/:hex Send Single Raw Transaction
   * @apiName SendSingleRawTransaction
   * @apiGroup RawTransactions
   * @apiDescription Submits single raw transaction (serialized, hex-encoded) to local node and network.
   *
   * @apiParam {String} hex Hex-encoded transaction
   *
   * @apiExample Example usage:
   * curl -X GET "https://api.fullstack.cash/v6/full-node/rawtransactions/sendRawTransaction/01000000013ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a000000006a4730440220540986d1c58d6e76f8f05501c520c38ce55393d0ed7ed3c3a82c69af04221232022058ea43ed6c05fec0eccce749a63332ed4525460105346f11108b9c26df93cd72012103083dfc5a0254613941ddc91af39ff90cd711cdcde03a87b144b883b524660c39ffffffff01807c814a000000001976a914d7e7c4e0b70eaa67ceff9d2823d1bbb9f6df9a5188ac00000000" -H "accept: application/json"
   */
  async sendRawTransactionSingle (req, res) {
    try {
      const hex = req.params.hex

      if (typeof hex !== 'string') {
        return res.status(400).json({ error: 'hex must be a string' })
      }

      if (hex === '') {
        return res.status(400).json({ error: 'Encountered empty hex' })
      }

      const result = await this.rawtransactionsUseCases.sendRawTransaction({ hex })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {post} /v6/full-node/rawtransactions/sendRawTransaction Send Bulk Raw Transactions
   * @apiName SendBulkRawTransactions
   * @apiGroup RawTransactions
   * @apiDescription Submits multiple raw transaction (serialized, hex-encoded) to local node and network.
   *
   * @apiParam {String[]} hexes Array of hex-encoded transactions
   *
   * @apiExample Example usage:
   * curl -X POST "https://api.fullstack.cash/v6/full-node/rawtransactions/sendRawTransaction" -H "accept: application/json" -H "Content-Type: application/json" -d '{"hexes":["01000000013ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a000000006a4730440220540986d1c58d6e76f8f05501c520c38ce55393d0ed7ed3c3a82c69af04221232022058ea43ed6c05fec0eccce749a63332ed4525460105346f11108b9c26df93cd72012103083dfc5a0254613941ddc91af39ff90cd711cdcde03a87b144b883b524660c39ffffffff01807c814a000000001976a914d7e7c4e0b70eaa67ceff9d2823d1bbb9f6df9a5188ac00000000"]}'
   */
  async sendRawTransactionBulk (req, res) {
    try {
      const hexes = req.body.hexes

      if (!Array.isArray(hexes)) {
        return res.status(400).json({ error: 'hex must be an array' })
      }

      if (!this.adapters.fullNode.validateArraySize(hexes.length)) {
        return res.status(400).json({ error: 'Array too large.' })
      }

      // Validate each element
      for (const hex of hexes) {
        if (hex === '') {
          return res.status(400).json({ error: 'Encountered empty hex' })
        }
      }

      const result = await this.rawtransactionsUseCases.sendRawTransactions({ hexes })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  handleError (err, res) {
    wlogger.error('Error in RawTransactionsRESTController:', err)

    const status = err.status || 500
    const message = err.message || 'Internal server error'

    return res.status(status).json({ error: message })
  }
}

export default RawTransactionsRESTController
