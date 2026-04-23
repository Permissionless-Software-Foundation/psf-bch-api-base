/*
  Build and cache discovery documents from apiDoc-style annotations.
*/

import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve } from 'path'

import config from '../config/index.js'
import { getX402AgentAuthPricing } from '../config/x402.js'

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
      'x-payment-model': 'x402-v2-exact-usdc'
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
    '> REST API proxy to Bitcoin Cash infrastructure with optional x402 (USDC on Base) monetized access.',
    '',
    '## Discovery',
    '- [OpenAPI document](/openapi.json): OpenAPI 3 projection generated from apiDoc annotations.',
    '- [Swagger document](/swagger.json): Swagger 2.0 compatibility projection.',
    '- [x402 manifest](/.well-known/x402): x402 v2 payment requirement discovery (Base USDC).',
    '- [x402.json](/.well-known/x402.json): same JSON as the x402 manifest (for tools that expect a `.json` path).',
    '- [Agent manifest](/.well-known/agent.json): draft agent capability surface.',
    '- [agent.json](/agent.json): same as the agent manifest (convenience path).',
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
  const pricing = getX402AgentAuthPricing()
  const actions = endpoints.map(endpoint => ({
    id: endpoint.operationId,
    description: endpoint.summary,
    auth_required: true,
    endpoint: endpoint.path,
    method: endpoint.method
  }))

  const auth = pricing
    ? {
        type: 'x402',
        x402Version: X402_SPEC_VERSION,
        required_for: actions.map(a => a.id),
        pricing: {
          scheme: pricing.scheme,
          network: pricing.network,
          payTo: pricing.payTo,
          priceUSDC: String(pricing.priceUSDC),
          facilitatorUrl: pricing.facilitatorUrl
        }
      }
    : {
        type: 'x402',
        x402Version: X402_SPEC_VERSION,
        required_for: actions.map(a => a.id),
        pricing: {
          note: 'Configure SERVER_BASE_ADDRESS, x402_NETWORK, and x402 for full pricing when X402 is enabled'
        }
      }

  return {
    awp_version: '0.1',
    name: 'psf-bch-api',
    description:
      'REST API for BCH full node, Fulcrum, and SLP data; access via x402 USDC on Base or documented bypasses.',
    domain: (process.env.PUBLIC_BASE_URL || '').trim() || null,
    intent: 'Programmatic BCH blockchain API access',
    discovery: {
      openapi: '/openapi.json',
      x402: '/.well-known/x402',
      x402_json: '/.well-known/x402.json',
      agent: '/.well-known/agent.json',
      agent_json: '/agent.json',
      llms: '/llms.txt'
    },
    capabilities: {
      batch_actions: false,
      streaming: false
    },
    auth,
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
