/*
  Unit tests for RawTransactionsRESTController.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import RawTransactionsRESTController from '../../../src/controllers/rest-api/full-node/rawtransactions/controller.js'
import { createMockRequest, createMockResponse } from '../mocks/controller-mocks.js'

describe('#rawtransactions-controller.js', () => {
  let sandbox
  let mockAdapters
  let mockUseCases
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {
      fullNode: {
        validateArraySize: sandbox.stub().returns(true)
      }
    }
    mockUseCases = {
      rawtransactions: {
        decodeRawTransaction: sandbox.stub().resolves({ txid: 'abc123' }),
        decodeRawTransactions: sandbox.stub().resolves([{ txid: 'abc123' }]),
        decodeScript: sandbox.stub().resolves({ asm: 'OP_DUP' }),
        decodeScripts: sandbox.stub().resolves([{ asm: 'OP_DUP' }]),
        getRawTransaction: sandbox.stub().resolves({ txid: 'abc123' }),
        getRawTransactionWithHeight: sandbox.stub().resolves({ txid: 'abc123', height: 100 }),
        getRawTransactions: sandbox.stub().resolves([{ txid: 'abc123' }]),
        sendRawTransaction: sandbox.stub().resolves('txid123'),
        sendRawTransactions: sandbox.stub().resolves(['txid1', 'txid2'])
      }
    }

    uut = new RawTransactionsRESTController({
      adapters: mockAdapters,
      useCases: mockUseCases
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#constructor()', () => {
    it('should require adapters', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new RawTransactionsRESTController({ useCases: mockUseCases })
      }, /Adapters library required/)
    })

    it('should require rawtransactions use cases', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new RawTransactionsRESTController({ adapters: mockAdapters, useCases: {} })
      }, /RawTransactions use cases required/)
    })
  })

  describe('#root()', () => {
    it('should return rawtransactions status', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.root(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { status: 'rawtransactions' })
    })
  })

  describe('#decodeRawTransactionSingle()', () => {
    it('should return decoded transaction on success', async () => {
      const req = createMockRequest({ params: { hex: '01000000' } })
      const res = createMockResponse()

      await uut.decodeRawTransactionSingle(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { txid: 'abc123' })
      assert.isTrue(mockUseCases.rawtransactions.decodeRawTransaction.calledOnce)
      assert.deepEqual(mockUseCases.rawtransactions.decodeRawTransaction.firstCall.args[0], { hex: '01000000' })
    })

    it('should return 400 if hex is empty', async () => {
      const req = createMockRequest({ params: { hex: '' } })
      const res = createMockResponse()

      await uut.decodeRawTransactionSingle(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'hex can not be empty' })
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('RPC error')
      error.status = 500
      mockUseCases.rawtransactions.decodeRawTransaction.rejects(error)
      const req = createMockRequest({ params: { hex: '01000000' } })
      const res = createMockResponse()

      await uut.decodeRawTransactionSingle(req, res)

      assert.equal(res.statusValue, 500)
      assert.deepEqual(res.jsonData, { error: 'RPC error' })
    })
  })

  describe('#decodeRawTransactionBulk()', () => {
    it('should return decoded transactions on success', async () => {
      const req = createMockRequest({ body: { hexes: ['hex1', 'hex2'] } })
      const res = createMockResponse()

      await uut.decodeRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, [{ txid: 'abc123' }])
      assert.isTrue(mockUseCases.rawtransactions.decodeRawTransactions.calledOnce)
    })

    it('should return 400 if hexes is not an array', async () => {
      const req = createMockRequest({ body: { hexes: 'not-array' } })
      const res = createMockResponse()

      await uut.decodeRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'hexes must be an array' })
    })

    it('should return 400 if array is too large', async () => {
      mockAdapters.fullNode.validateArraySize.returns(false)
      const req = createMockRequest({ body: { hexes: new Array(25).fill('hex') } })
      const res = createMockResponse()

      await uut.decodeRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'Array too large.' })
    })

    it('should return 400 if empty hex encountered', async () => {
      const req = createMockRequest({ body: { hexes: ['hex1', '', 'hex2'] } })
      const res = createMockResponse()

      await uut.decodeRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'Encountered empty hex' })
    })
  })

  describe('#decodeScriptSingle()', () => {
    it('should return decoded script on success', async () => {
      const req = createMockRequest({ params: { hex: '76a914' } })
      const res = createMockResponse()

      await uut.decodeScriptSingle(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { asm: 'OP_DUP' })
      assert.isTrue(mockUseCases.rawtransactions.decodeScript.calledOnce)
    })

    it('should return 400 if hex is empty', async () => {
      const req = createMockRequest({ params: { hex: '' } })
      const res = createMockResponse()

      await uut.decodeScriptSingle(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'hex can not be empty' })
    })
  })

  describe('#decodeScriptBulk()', () => {
    it('should return decoded scripts on success', async () => {
      const req = createMockRequest({ body: { hexes: ['script1', 'script2'] } })
      const res = createMockResponse()

      await uut.decodeScriptBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, [{ asm: 'OP_DUP' }])
    })

    it('should return 400 if array is too large', async () => {
      mockAdapters.fullNode.validateArraySize.returns(false)
      const req = createMockRequest({ body: { hexes: new Array(25).fill('script') } })
      const res = createMockResponse()

      await uut.decodeScriptBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'Array too large.' })
    })
  })

  describe('#getRawTransactionSingle()', () => {
    it('should return raw transaction on success', async () => {
      const req = createMockRequest({ params: { txid: 'a'.repeat(64) }, query: {} })
      const res = createMockResponse()

      await uut.getRawTransactionSingle(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { txid: 'abc123', height: 100 })
      assert.isTrue(mockUseCases.rawtransactions.getRawTransactionWithHeight.calledOnce)
    })

    it('should pass verbose=true when query param is set', async () => {
      const req = createMockRequest({ params: { txid: 'a'.repeat(64) }, query: { verbose: 'true' } })
      const res = createMockResponse()

      await uut.getRawTransactionSingle(req, res)

      assert.isTrue(mockUseCases.rawtransactions.getRawTransactionWithHeight.calledOnce)
      assert.deepEqual(mockUseCases.rawtransactions.getRawTransactionWithHeight.firstCall.args[0], {
        txid: 'a'.repeat(64),
        verbose: true
      })
    })

    it('should return 400 if txid is empty', async () => {
      const req = createMockRequest({ params: { txid: '' } })
      const res = createMockResponse()

      await uut.getRawTransactionSingle(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'txid can not be empty' })
    })

    it('should return 400 if txid length is not 64', async () => {
      const req = createMockRequest({ params: { txid: 'short' } })
      const res = createMockResponse()

      await uut.getRawTransactionSingle(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'parameter 1 must be of length 64 (not 5)' })
    })
  })

  describe('#getRawTransactionBulk()', () => {
    it('should return raw transactions on success', async () => {
      const req = createMockRequest({
        body: {
          txids: ['a'.repeat(64), 'b'.repeat(64)],
          verbose: true
        }
      })
      const res = createMockResponse()

      await uut.getRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, [{ txid: 'abc123' }])
      assert.isTrue(mockUseCases.rawtransactions.getRawTransactions.calledOnce)
      assert.deepEqual(mockUseCases.rawtransactions.getRawTransactions.firstCall.args[0], {
        txids: ['a'.repeat(64), 'b'.repeat(64)],
        verbose: true
      })
    })

    it('should return 400 if txids is not an array', async () => {
      const req = createMockRequest({ body: { txids: 'not-array' } })
      const res = createMockResponse()

      await uut.getRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'txids must be an array' })
    })

    it('should return 400 if array is too large', async () => {
      mockAdapters.fullNode.validateArraySize.returns(false)
      const req = createMockRequest({ body: { txids: new Array(25).fill('a'.repeat(64)) } })
      const res = createMockResponse()

      await uut.getRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'Array too large.' })
    })

    it('should return 400 if empty txid encountered', async () => {
      const req = createMockRequest({ body: { txids: ['a'.repeat(64), ''] } })
      const res = createMockResponse()

      await uut.getRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'Encountered empty TXID' })
    })

    it('should return 400 if txid length is not 64', async () => {
      const req = createMockRequest({ body: { txids: ['short'] } })
      const res = createMockResponse()

      await uut.getRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'parameter 1 must be of length 64 (not 5)' })
    })
  })

  describe('#sendRawTransactionSingle()', () => {
    it('should return txid on success', async () => {
      const req = createMockRequest({ params: { hex: '01000000' } })
      const res = createMockResponse()

      await uut.sendRawTransactionSingle(req, res)

      assert.equal(res.statusValue, 200)
      assert.equal(res.jsonData, 'txid123')
      assert.isTrue(mockUseCases.rawtransactions.sendRawTransaction.calledOnce)
    })

    it('should return 400 if hex is empty', async () => {
      const req = createMockRequest({ params: { hex: '' } })
      const res = createMockResponse()

      await uut.sendRawTransactionSingle(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'Encountered empty hex' })
    })

    it('should return 400 if hex is not a string', async () => {
      const req = createMockRequest({ params: { hex: 123 } })
      const res = createMockResponse()

      await uut.sendRawTransactionSingle(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'hex must be a string' })
    })
  })

  describe('#sendRawTransactionBulk()', () => {
    it('should return txids on success', async () => {
      const req = createMockRequest({ body: { hexes: ['hex1', 'hex2'] } })
      const res = createMockResponse()

      await uut.sendRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, ['txid1', 'txid2'])
      assert.isTrue(mockUseCases.rawtransactions.sendRawTransactions.calledOnce)
    })

    it('should return 400 if hexes is not an array', async () => {
      const req = createMockRequest({ body: { hexes: 'not-array' } })
      const res = createMockResponse()

      await uut.sendRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'hex must be an array' })
    })

    it('should return 400 if array is too large', async () => {
      mockAdapters.fullNode.validateArraySize.returns(false)
      const req = createMockRequest({ body: { hexes: new Array(25).fill('hex') } })
      const res = createMockResponse()

      await uut.sendRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'Array too large.' })
    })

    it('should return 400 if empty hex encountered', async () => {
      const req = createMockRequest({ body: { hexes: ['hex1', '', 'hex2'] } })
      const res = createMockResponse()

      await uut.sendRawTransactionBulk(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, { error: 'Encountered empty hex' })
    })
  })
})
