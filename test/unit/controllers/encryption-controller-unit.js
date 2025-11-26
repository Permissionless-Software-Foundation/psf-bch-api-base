/*
  Unit tests for EncryptionRESTController.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import EncryptionRESTController from '../../../src/controllers/rest-api/encryption/controller.js'
import { createMockRequest, createMockResponse, createMockRequestWithParams } from '../mocks/controller-mocks.js'

describe('#encryption-controller.js', () => {
  let sandbox
  let mockAdapters
  let mockUseCases
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {}
    mockUseCases = {
      encryption: {
        getPublicKey: sandbox.stub().resolves({
          success: true,
          publicKey: '02abc123def456789'
        })
      }
    }

    uut = new EncryptionRESTController({
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
        new EncryptionRESTController({ useCases: mockUseCases })
      }, /Adapters library required/)
    })

    it('should require encryption use cases', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new EncryptionRESTController({ adapters: mockAdapters, useCases: {} })
      }, /Encryption use cases required/)
    })
  })

  describe('#root()', () => {
    it('should return encryption status', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.root(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { status: 'encryption' })
    })
  })

  describe('#getPublicKey()', () => {
    it('should return public key on success', async () => {
      const req = createMockRequestWithParams({
        address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      })
      const res = createMockResponse()

      await uut.getPublicKey(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, {
        success: true,
        publicKey: '02abc123def456789'
      })
      assert.isTrue(mockUseCases.encryption.getPublicKey.calledOnce)
      assert.isTrue(mockUseCases.encryption.getPublicKey.calledWith({
        address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      }))
    })

    it('should return not found when public key is not found', async () => {
      mockUseCases.encryption.getPublicKey.resolves({
        success: false,
        publicKey: 'not found'
      })

      const req = createMockRequestWithParams({
        address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      })
      const res = createMockResponse()

      await uut.getPublicKey(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, {
        success: false,
        publicKey: 'not found'
      })
    })

    it('should reject array addresses', async () => {
      const req = createMockRequestWithParams({
        address: ['addr1', 'addr2']
      })
      const res = createMockResponse()

      await uut.getPublicKey(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, {
        success: false,
        error: 'address can not be an array.'
      })
      assert.isFalse(mockUseCases.encryption.getPublicKey.called)
    })

    it('should reject missing address', async () => {
      const req = createMockRequestWithParams({})
      const res = createMockResponse()

      await uut.getPublicKey(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, {
        success: false,
        error: 'address is required.'
      })
      assert.isFalse(mockUseCases.encryption.getPublicKey.called)
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('No transaction history.')
      error.status = 400
      mockUseCases.encryption.getPublicKey.rejects(error)

      const req = createMockRequestWithParams({
        address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      })
      const res = createMockResponse()

      await uut.getPublicKey(req, res)

      assert.equal(res.statusValue, 400)
      assert.deepEqual(res.jsonData, {
        success: false,
        error: 'No transaction history.'
      })
    })

    it('should default to 500 status for errors without status', async () => {
      const error = new Error('Internal error')
      mockUseCases.encryption.getPublicKey.rejects(error)

      const req = createMockRequestWithParams({
        address: 'bitcoincash:qrdka2205f4hyukutc2g0s6lykperc8nsu5u2ddpqf'
      })
      const res = createMockResponse()

      await uut.getPublicKey(req, res)

      assert.equal(res.statusValue, 500)
      assert.deepEqual(res.jsonData, {
        success: false,
        error: 'Internal error'
      })
    })
  })

  describe('#handleError()', () => {
    it('should use error status and message when provided', () => {
      const error = new Error('Custom error')
      error.status = 422
      const res = createMockResponse()

      uut.handleError(error, res)

      assert.equal(res.statusValue, 422)
      assert.deepEqual(res.jsonData, {
        success: false,
        error: 'Custom error'
      })
    })

    it('should default to 500 and Internal server error', () => {
      const error = {}
      const res = createMockResponse()

      uut.handleError(error, res)

      assert.equal(res.statusValue, 500)
      assert.deepEqual(res.jsonData, {
        success: false,
        error: 'Internal server error'
      })
    })
  })
})
