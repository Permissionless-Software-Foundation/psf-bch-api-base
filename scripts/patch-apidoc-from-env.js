/*
  Applies APIDOC_URL from the environment to apidoc.json and package.json (apidoc.url).
  Loads dotenv from the project root `.env` (same file as `dotenv.config()` in bin/server.js).
  Exits without changes when APIDOC_URL is unset or empty.
*/

import dotenv from 'dotenv'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

dotenv.config({ path: resolve(root, '.env') })

const url = process.env.APIDOC_URL
if (url === undefined || url === null || String(url).trim() === '') {
  process.exit(0)
}

const normalized = String(url).trim()

function patchApidocJson () {
  const path = resolve(root, 'apidoc.json')
  const data = JSON.parse(readFileSync(path, 'utf8'))
  data.url = normalized
  data.sampleUrl = normalized
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function patchPackageJson () {
  const path = resolve(root, 'package.json')
  const data = JSON.parse(readFileSync(path, 'utf8'))
  if (!data.apidoc) data.apidoc = {}
  data.apidoc.url = normalized
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

patchApidocJson()
patchPackageJson()
