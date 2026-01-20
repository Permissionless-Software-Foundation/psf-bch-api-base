/*
  REST API Controller for the /full-node/blockchain routes.
*/

import wlogger from '../../../../adapters/wlogger.js'

class BlockchainRESTController {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(
        'Instance of Adapters library required when instantiating Blockchain REST Controller.'
      )
    }

    this.useCases = localConfig.useCases
    if (!this.useCases || !this.useCases.blockchain) {
      throw new Error(
        'Instance of Blockchain use cases required when instantiating Blockchain REST Controller.'
      )
    }

    this.blockchainUseCases = this.useCases.blockchain

    // Bind functions
    this.root = this.root.bind(this)
    this.getBestBlockHash = this.getBestBlockHash.bind(this)
    this.getBlockchainInfo = this.getBlockchainInfo.bind(this)
    this.getBlockCount = this.getBlockCount.bind(this)
    this.getBlockHeaderSingle = this.getBlockHeaderSingle.bind(this)
    this.getBlockHeaderBulk = this.getBlockHeaderBulk.bind(this)
    this.getChainTips = this.getChainTips.bind(this)
    this.getDifficulty = this.getDifficulty.bind(this)
    this.getMempoolEntrySingle = this.getMempoolEntrySingle.bind(this)
    this.getMempoolEntryBulk = this.getMempoolEntryBulk.bind(this)
    this.getMempoolAncestorsSingle = this.getMempoolAncestorsSingle.bind(this)
    this.getMempoolInfo = this.getMempoolInfo.bind(this)
    this.getRawMempool = this.getRawMempool.bind(this)
    this.getTxOut = this.getTxOut.bind(this)
    this.getTxOutPost = this.getTxOutPost.bind(this)
    this.getTxOutProofSingle = this.getTxOutProofSingle.bind(this)
    this.getTxOutProofBulk = this.getTxOutProofBulk.bind(this)
    this.verifyTxOutProofSingle = this.verifyTxOutProofSingle.bind(this)
    this.verifyTxOutProofBulk = this.verifyTxOutProofBulk.bind(this)
    this.getBlock = this.getBlock.bind(this)
    this.getBlockHash = this.getBlockHash.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  /**
   * @api {get} /v6/full-node/blockchain/ Service status
   * @apiName BlockchainRoot
   * @apiGroup Blockchain
   *
   * @apiDescription Returns the status of the blockchain service.
   *
   * @apiSuccess {String} status Service identifier
   */
  async root (req, res) {
    return res.status(200).json({ status: 'blockchain' })
  }

  /**
   * @api {get} /v6/full-node/blockchain/getBestBlockHash Get best block hash
   * @apiName GetBestBlockHash
   * @apiGroup Blockchain
   * @apiDescription Returns the hash of the best (tip) block in the longest block chain.
   *
   * @apiExample Example usage:
   * curl -X GET "https://api.fullstack.cash/v6/full-node/blockchain/getBestBlockHash" -H "accept: application/json"
   *
   * @apiSuccess {String} bestBlockHash Hash of the best block
   */
  async getBestBlockHash (req, res) {
    try {
      const result = await this.blockchainUseCases.getBestBlockHash()
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getBlockchainInfo Get blockchain info
   * @apiName GetBlockchainInfo
   * @apiGroup Blockchain
   * @apiDescription Returns various state info regarding blockchain processing.
   */
  async getBlockchainInfo (req, res) {
    try {
      const result = await this.blockchainUseCases.getBlockchainInfo()
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getBlockCount Get block count
   * @apiName GetBlockCount
   * @apiGroup Blockchain
   * @apiDescription Returns the number of blocks in the longest blockchain.
   */
  async getBlockCount (req, res) {
    try {
      const result = await this.blockchainUseCases.getBlockCount()
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getBlockHeader/:hash Get single block header
   * @apiName GetSingleBlockHeader
   * @apiGroup Blockchain
   * @apiDescription Returns serialized block header data.
   *
   * @apiParam {String} hash Block hash
   * @apiParam {Boolean} verbose Return verbose data (default false)
   */
  async getBlockHeaderSingle (req, res) {
    try {
      const hash = req.params.hash
      if (!hash) {
        return res.status(400).json({ error: 'hash can not be empty' })
      }

      const verbose = req.query.verbose?.toString() === 'true'
      const result = await this.blockchainUseCases.getBlockHeader({ hash, verbose })

      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {post} /v6/full-node/blockchain/getBlockHeader Get multiple block headers
   * @apiName GetBulkBlockHeader
   * @apiGroup Blockchain
   * @apiDescription Returns serialized block header data for multiple hashes.
   *
   * @apiParam {String[]} hashes Block hashes
   * @apiParam {Boolean} verbose Return verbose data (default false)
   */
  async getBlockHeaderBulk (req, res) {
    try {
      const hashes = req.body.hashes
      const verbose = !!req.body.verbose

      if (!Array.isArray(hashes)) {
        return res.status(400).json({
          error: 'hashes needs to be an array. Use GET for single hash.'
        })
      }

      if (!this.adapters.fullNode.validateArraySize(hashes.length)) {
        return res.status(400).json({ error: 'Array too large.' })
      }

      for (const hash of hashes) {
        if (!hash || hash.length !== 64) {
          return res.status(400).json({ error: `This is not a hash: ${hash}` })
        }
      }

      const result = await this.blockchainUseCases.getBlockHeaders({ hashes, verbose })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getChainTips Get chain tips
   * @apiName GetChainTips
   * @apiGroup Blockchain
   * @apiDescription Returns information about known tips in the block tree.
   */
  async getChainTips (req, res) {
    try {
      const result = await this.blockchainUseCases.getChainTips()
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getDifficulty Get difficulty
   * @apiName GetDifficulty
   * @apiGroup Blockchain
   * @apiDescription Returns the current difficulty value.
   */
  async getDifficulty (req, res) {
    try {
      const result = await this.blockchainUseCases.getDifficulty()
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getMempoolEntry/:txid Get single mempool entry
   * @apiName GetMempoolEntry
   * @apiGroup Blockchain
   * @apiDescription Returns mempool data for a transaction.
   */
  async getMempoolEntrySingle (req, res) {
    try {
      const txid = req.params.txid
      if (!txid) {
        return res.status(400).json({ error: 'txid can not be empty' })
      }

      const result = await this.blockchainUseCases.getMempoolEntry({ txid })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {post} /v6/full-node/blockchain/getMempoolEntry Get bulk mempool entry
   * @apiName GetMempoolEntryBulk
   * @apiGroup Blockchain
   * @apiDescription Returns mempool data for multiple transactions.
   */
  async getMempoolEntryBulk (req, res) {
    try {
      const txids = req.body.txids

      if (!Array.isArray(txids)) {
        return res.status(400).json({
          error: 'txids needs to be an array. Use GET for single txid.'
        })
      }

      if (!this.adapters.fullNode.validateArraySize(txids.length)) {
        return res.status(400).json({ error: 'Array too large.' })
      }

      for (const txid of txids) {
        if (!txid || txid.length !== 64) {
          return res.status(400).json({ error: 'This is not a txid' })
        }
      }

      const result = await this.blockchainUseCases.getMempoolEntries({ txids })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getMempoolAncestors/:txid Get mempool ancestors
   * @apiName GetMempoolAncestors
   * @apiGroup Blockchain
   * @apiDescription Returns mempool ancestor data for a transaction.
   */
  async getMempoolAncestorsSingle (req, res) {
    try {
      const txid = req.params.txid
      if (!txid) {
        return res.status(400).json({ error: 'txid can not be empty' })
      }

      let verbose = false
      if (req.query.verbose && req.query.verbose.toString() === 'true') {
        verbose = true
      }

      const result = await this.blockchainUseCases.getMempoolAncestors({ txid, verbose })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getMempoolInfo Get mempool info
   * @apiName GetMempoolInfo
   * @apiGroup Blockchain
   * @apiDescription Returns details on the state of the mempool.
   */
  async getMempoolInfo (req, res) {
    try {
      const result = await this.blockchainUseCases.getMempoolInfo()
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getRawMempool Get raw mempool
   * @apiName GetRawMempool
   * @apiGroup Blockchain
   * @apiDescription Returns all transaction ids in the mempool.
   *
   * @apiParam {Boolean} verbose Return verbose data (default false)
   */
  async getRawMempool (req, res) {
    try {
      const verbose = req.query.verbose === 'true'
      const result = await this.blockchainUseCases.getRawMempool({ verbose })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getTxOut/:txid/:n Get transaction output
   * @apiName GetTxOut
   * @apiGroup Blockchain
   * @apiDescription Returns details about an unspent transaction output.
   */
  async getTxOut (req, res) {
    try {
      const txid = req.params.txid
      if (!txid) {
        return res.status(400).json({ error: 'txid can not be empty' })
      }

      const nRaw = req.params.n
      if (nRaw === undefined || nRaw === '') {
        return res.status(400).json({ error: 'n can not be empty' })
      }

      const n = parseInt(nRaw)
      const includeMempool = req.query.includeMempool === 'true'

      const result = await this.blockchainUseCases.getTxOut({
        txid,
        n,
        includeMempool
      })

      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {post} /v6/full-node/blockchain/getTxOut Validate a UTXO
   * @apiName GetTxOutPost
   * @apiGroup Blockchain
   * @apiDescription Returns details about an unspent transaction output.
   */
  async getTxOutPost (req, res) {
    try {
      const txid = req.body.txid
      if (!txid) {
        return res.status(400).json({ error: 'txid can not be empty' })
      }

      const voutRaw = req.body.vout
      if (voutRaw === undefined || voutRaw === '') {
        return res.status(400).json({ error: 'vout can not be empty' })
      }

      const n = parseInt(voutRaw)
      const mempool = req.body.mempool !== undefined ? !!req.body.mempool : true

      const result = await this.blockchainUseCases.getTxOut({
        txid,
        n,
        includeMempool: mempool
      })

      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getTxOutProof/:txid Get TxOut proof
   * @apiName GetTxOutProofSingle
   * @apiGroup Blockchain
   * @apiDescription Returns a hex-encoded proof that the transaction was included in a block.
   */
  async getTxOutProofSingle (req, res) {
    try {
      const txid = req.params.txid
      if (!txid) {
        return res.status(400).json({ error: 'txid can not be empty' })
      }

      const result = await this.blockchainUseCases.getTxOutProof({ txid })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {post} /v6/full-node/blockchain/getTxOutProof Get TxOut proofs
   * @apiName GetTxOutProofBulk
   * @apiGroup Blockchain
   * @apiDescription Returns hex-encoded proofs for transactions.
   */
  async getTxOutProofBulk (req, res) {
    try {
      const txids = req.body.txids

      if (!Array.isArray(txids)) {
        return res.status(400).json({
          error: 'txids needs to be an array. Use GET for single txid.'
        })
      }

      if (!this.adapters.fullNode.validateArraySize(txids.length)) {
        return res.status(400).json({ error: 'Array too large.' })
      }

      for (const txid of txids) {
        if (!txid || txid.length !== 64) {
          return res.status(400).json({
            error: `Invalid txid. Double check your txid is valid: ${txid}`
          })
        }
      }

      const result = await this.blockchainUseCases.getTxOutProofs({ txids })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/verifyTxOutProof/:proof Verify TxOut proof
   * @apiName VerifyTxOutProofSingle
   * @apiGroup Blockchain
   * @apiDescription Verifies a hex-encoded proof was included in a block.
   */
  async verifyTxOutProofSingle (req, res) {
    try {
      const proof = req.params.proof
      if (!proof) {
        return res.status(400).json({ error: 'proof can not be empty' })
      }

      const result = await this.blockchainUseCases.verifyTxOutProof({ proof })
      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {post} /v6/full-node/blockchain/verifyTxOutProof Verify TxOut proofs
   * @apiName VerifyTxOutProofBulk
   * @apiGroup Blockchain
   * @apiDescription Verifies hex-encoded proofs were included in blocks.
   */
  async verifyTxOutProofBulk (req, res) {
    try {
      const proofs = req.body.proofs

      if (!Array.isArray(proofs)) {
        return res.status(400).json({
          error: 'proofs needs to be an array. Use GET for single proof.'
        })
      }

      if (!this.adapters.fullNode.validateArraySize(proofs.length)) {
        return res.status(400).json({ error: 'Array too large.' })
      }

      for (const proof of proofs) {
        if (!proof) {
          return res.status(400).json({ error: `proof can not be empty: ${proof}` })
        }
      }

      const result = await this.blockchainUseCases.verifyTxOutProofs({ proofs })
      const flattened = result.map(entry => Array.isArray(entry) ? entry[0] : entry)

      return res.status(200).json(flattened)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {post} /v6/full-node/blockchain/getBlock Get block details
   * @apiName GetBlock
   * @apiGroup Blockchain
   * @apiDescription Returns block details for a hash.
   */
  async getBlock (req, res) {
    try {
      const blockhash = req.body.blockhash
      if (!blockhash) {
        return res.status(400).json({ error: 'blockhash can not be empty' })
      }

      let verbosity = req.body.verbosity
      if (verbosity === undefined || verbosity === null) {
        verbosity = 1
      }

      const result = await this.blockchainUseCases.getBlock({
        blockhash,
        verbosity
      })

      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  /**
   * @api {get} /v6/full-node/blockchain/getBlockHash/:height Get block hash
   * @apiName GetBlockHash
   * @apiGroup Blockchain
   * @apiDescription Returns the hash of a block by height.
   */
  async getBlockHash (req, res) {
    try {
      const heightRaw = req.params.height
      if (!heightRaw) {
        return res.status(400).json({ error: 'height can not be empty' })
      }

      const height = parseInt(heightRaw)
      const result = await this.blockchainUseCases.getBlockHash({ height })

      return res.status(200).json(result)
    } catch (err) {
      return this.handleError(err, res)
    }
  }

  handleError (err, res) {
    wlogger.error('Error in BlockchainRESTController:', err)

    const status = err.status || 500
    const message = err.message || 'Internal server error'

    return res.status(status).json({ error: message })
  }
}

export default BlockchainRESTController
