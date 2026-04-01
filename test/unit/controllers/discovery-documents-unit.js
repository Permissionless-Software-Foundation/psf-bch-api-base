/*
  Unit tests for discovery document builder.
*/

import { assert } from 'chai'

import { buildDiscoveryDocuments } from '../../../src/discovery/build-documents.js'

describe('#discovery-build-documents.js', () => {
  it('should build openapi and swagger documents with v6 paths', () => {
    const docs = buildDiscoveryDocuments()

    assert.property(docs, 'openapi')
    assert.property(docs, 'swagger')
    assert.property(docs, 'llms')
    assert.property(docs, 'agent')

    assert.isString(docs.openapi.openapi)
    assert.equal(docs.swagger.swagger, '2.0')
    assert.isAbove(Object.keys(docs.openapi.paths).length, 0)

    const hasV6Path = Object.keys(docs.openapi.paths).some(path => path.startsWith('/v6/'))
    assert.isTrue(hasV6Path)
  })
})
