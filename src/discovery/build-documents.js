/*
  Build and cache discovery documents from apiDoc-style annotations.
*/

import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve } from 'path'

import config from '../config/index.js'
import { getX402Settings } from '../config/x402.js'

const BCH_MAINNET_CAIP2 = 'bip122:000000000000000000651ef99cb9fcbe'
const X402_SPEC_VERSION = 2

let cachedDocs = null

function parseApiAnnotations () {
  const srcRoot = resolve(process.cwd(), 'src/controllers/rest-api')
  const entries = []
  const files = walkJsFiles(srcRoot)

  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const blocks = text.match(/\/\*\*[\s\S]*?\*\//g) || []

    for (const block of blocks) {
      const endpoint = parseBlock(block)
      if (endpoint) entries.push(endpoint)
    }
  }

  return entries
}

function parseBlock (block) {
  const methodMatch = block.match(/@api\s+\{([^}]+)\}\s+(\S+)\s+([^\n\r*]+)/)
  if (!methodMatch) return null

  const method = methodMatch[1].trim().toUpperCase()
  const path = methodMatch[2].trim()
  const summary = methodMatch[3].trim()

  const groupMatch = block.match(/@apiGroup\s+([^\n\r*]+)/)
  const descriptionMatch = block.match(/@apiDescription\s+([^\n\r*][\s\S]*?)(?=\n\s*\*\s*@api|\n\s*\*\/)/)
  const apiNameMatch = block.match(/@apiName\s+([^\n\r*]+)/)

  return {
    method,
    path,
    summary,
    group: groupMatch ? groupMatch[1].trim() : 'General',
    operationId: apiNameMatch ? apiNameMatch[1].trim() : `${method.toLowerCase()}_${path.replace(/[^\w]/g, '_')}`,
    description: descriptionMatch
      ? descriptionMatch[1].replace(/\n\s*\*\s?/g, ' ').trim()
      : summary
  }
}

function walkJsFiles (dir) {
  const output = []

  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, item.name)
    if (item.isDirectory()) {
      output.push(...walkJsFiles(fullPath))
      continue
    }

    if (item.isFile() && fullPath.endsWith('.js')) output.push(fullPath)
  }

  return output
}

function normalizePaths (endpoints) {
  const paths = {}

  for (const endpoint of endpoints) {
    if (!paths[endpoint.path]) paths[endpoint.path] = {}

    const op = {
      tags: [endpoint.group],
      summary: endpoint.summary,
      description: endpoint.description,
      operationId: endpoint.operationId,
      responses: {
        200: {
          description: 'Successful response'
        },
        402: {
          description: 'Payment required when x402 is enabled'
        }
      },
      'x-payment-model': 'x402-bch-v2'
    }

    paths[endpoint.path][endpoint.method.toLowerCase()] = op
  }

  return paths
}

function buildOpenApi (paths) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'psf-bch-api',
      version: config.version,
      description: 'OpenAPI projection generated from apiDoc annotations'
    },
    servers: [
      {
        url: '/'
      }
    ],
    paths
  }
}

function buildSwagger (paths) {
  return {
    swagger: '2.0',
    info: {
      title: 'psf-bch-api',
      version: config.version,
      description: 'Swagger projection generated from apiDoc annotations'
    },
    basePath: '/',
    schemes: ['https', 'http'],
    paths
  }
}

function buildLlms (endpoints) {
  const lines = [
    '# psf-bch-api',
    '',
    '> REST API proxy to Bitcoin Cash infrastructure with optional x402-bch monetized access.',
    '',
    '## Discovery',
    '- [OpenAPI document](/openapi.json): OpenAPI 3 projection generated from apiDoc annotations.',
    '- [Swagger document](/swagger.json): Swagger 2.0 compatibility projection.',
    '- [x402 manifest](/.well-known/x402): x402-bch v2 payment requirement discovery.',
    '- [Agent manifest](/.well-known/agent.json): draft agent capability surface.',
    '',
    '## API Groups'
  ]

  const seen = new Set()
  for (const endpoint of endpoints) {
    if (seen.has(endpoint.group)) continue
    seen.add(endpoint.group)
    lines.push(`- ${endpoint.group}`)
  }

  lines.push('', '## Optional', '- [Human docs](/): apiDoc HTML documentation root.')
  return lines.join('\n')
}

function buildAgent (endpoints) {
  const x402 = getX402Settings()
  const actions = endpoints.map(endpoint => ({
    id: endpoint.operationId,
    description: endpoint.summary,
    auth_required: true,
    endpoint: endpoint.path,
    method: endpoint.method
  }))

  return {
    awp_version: '0.1',
    domain: 'localhost',
    intent: 'Programmatic BCH blockchain API access',
    capabilities: {
      batch_actions: false,
      streaming: false
    },
    auth: {
      type: 'x402-bch-v2',
      required_for: actions.map(a => a.id),
      pricing: {
        amountSat: String(x402.priceSat),
        payTo: x402.serverAddress,
        network: BCH_MAINNET_CAIP2,
        x402Version: X402_SPEC_VERSION
      }
    },
    actions
  }
}

export function buildDiscoveryDocuments () {
  const endpoints = parseApiAnnotations()
  const paths = normalizePaths(endpoints)

  return {
    openapi: buildOpenApi(paths),
    swagger: buildSwagger(paths),
    llms: buildLlms(endpoints),
    agent: buildAgent(endpoints)
  }
}

export function getDiscoveryDocuments () {
  if (cachedDocs) return cachedDocs

  const artifactPath = resolve(process.cwd(), 'docs/discovery-artifacts.json')
  if (existsSync(artifactPath)) {
    try {
      cachedDocs = JSON.parse(readFileSync(artifactPath, 'utf8'))
      return cachedDocs
    } catch {
      cachedDocs = buildDiscoveryDocuments()
      return cachedDocs
    }
  }

  cachedDocs = buildDiscoveryDocuments()
  return cachedDocs
}

export function resetDiscoveryDocumentCache () {
  cachedDocs = null
}
