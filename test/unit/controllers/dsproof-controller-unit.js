/*
  Unit tests for DSProofRESTController.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import DSProofRESTController from '../../../src/controllers/rest-api/full-node/dsproof/controller.js'
import { createMockRequest, createMockResponse } from '../mocks/controller-mocks.js'

describe('#dsproof-controller.js', () => {
  let sandbox
  let mockAdapters
  let mockUseCases
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {}
    mockUseCases = {
      dsproof: {
        getDSProof: sandbox.stub().resolves({ proof: true })
      }
    }

    uut = new DSProofRESTController({
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
        new DSProofRESTController({ useCases: mockUseCases })
      }, /Adapters library required/)
    })

    it('should require dsproof use cases', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new DSProofRESTController({ adapters: mockAdapters, useCases: {} })
      }, /DSProof use cases required/)
    })
  })

  describe('#root()', () => {
    it('should return dsproof status', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.root(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { status: 'dsproof' })
    })
  })

  describe('#getDSProof()', () => {
    it('should validate txid presence', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getDSProof(req, res)

      assert.equal(res.statusValue, 400)
      assert.include(res.jsonData.error, 'txid can not be empty')
    })

    it('should validate txid length', async () => {
      const req = createMockRequest({ params: { txid: 'abc' } })
      const res = createMockResponse()

      await uut.getDSProof(req, res)

      assert.equal(res.statusValue, 400)
      assert.include(res.jsonData.error, 'txid must be of length 64')
    })

    it('should call use case with derived verbose when valid', async () => {
      const txid = 'a'.repeat(64)
      const req = createMockRequest({
        params: { txid },
        query: { verbose: 'true' }
      })
      const res = createMockResponse()

      await uut.getDSProof(req, res)

      assert.equal(res.statusValue, 200)
      assert.isTrue(mockUseCases.dsproof.getDSProof.calledOnceWithExactly({
        txid,
        verbose: 3
      }))
      assert.deepEqual(res.jsonData, { proof: true })
    })

    it('should handle errors via handleError', async () => {
      const txid = 'a'.repeat(64)
      const error = new Error('failure')
      error.status = 422
      mockUseCases.dsproof.getDSProof.rejects(error)
      const req = createMockRequest({ params: { txid } })
      const res = createMockResponse()

      await uut.getDSProof(req, res)

      assert.equal(res.statusValue, 422)
      assert.deepEqual(res.jsonData, { error: 'failure' })
    })
  })
})
