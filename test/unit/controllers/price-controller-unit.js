/*
  Unit tests for PriceRESTController.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import PriceRESTController from '../../../src/controllers/rest-api/price/controller.js'
import { createMockRequest, createMockResponse } from '../mocks/controller-mocks.js'

describe('#price-controller.js', () => {
  let sandbox
  let mockAdapters
  let mockUseCases
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockAdapters = {}
    mockUseCases = {
      price: {
        getBCHUSD: sandbox.stub().resolves(250.5),
        getPsffppWritePrice: sandbox.stub().resolves(0.08335233)
      }
    }

    uut = new PriceRESTController({
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
        new PriceRESTController({ useCases: mockUseCases })
      }, /Adapters library required/)
    })

    it('should require price use cases', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new PriceRESTController({ adapters: mockAdapters, useCases: {} })
      }, /Price use cases required/)
    })
  })

  describe('#root()', () => {
    it('should return price status', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.root(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { status: 'price' })
    })
  })

  describe('#getBCHUSD()', () => {
    it('should return BCH USD price on success', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getBCHUSD(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { usd: 250.5 })
      assert.isTrue(mockUseCases.price.getBCHUSD.calledOnce)
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('API failure')
      error.status = 503
      mockUseCases.price.getBCHUSD.rejects(error)
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getBCHUSD(req, res)

      assert.equal(res.statusValue, 503)
      assert.deepEqual(res.jsonData, { error: 'API failure' })
    })
  })

  describe('#getPsffppWritePrice()', () => {
    it('should return PSFFPP write price on success', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getPsffppWritePrice(req, res)

      assert.equal(res.statusValue, 200)
      assert.deepEqual(res.jsonData, { writePrice: 0.08335233 })
      assert.isTrue(mockUseCases.price.getPsffppWritePrice.calledOnce)
    })

    it('should handle errors via handleError', async () => {
      const error = new Error('PSFFPP failure')
      error.status = 500
      mockUseCases.price.getPsffppWritePrice.rejects(error)
      const req = createMockRequest()
      const res = createMockResponse()

      await uut.getPsffppWritePrice(req, res)

      assert.equal(res.statusValue, 500)
      assert.deepEqual(res.jsonData, { error: 'PSFFPP failure' })
    })
  })
})
