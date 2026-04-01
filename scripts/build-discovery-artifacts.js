/*
  Build discovery endpoint artifacts from apiDoc source annotations.
*/

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { buildDiscoveryDocuments } from '../src/discovery/build-documents.js'

function main () {
  const outputPath = resolve(process.cwd(), 'docs/discovery-artifacts.json')
  const docs = buildDiscoveryDocuments()

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(docs, null, 2)}\n`)

  // eslint-disable-next-line no-console
  console.log(`Wrote discovery artifacts to ${outputPath}`)
}

main()
