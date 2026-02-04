/*
  Basic Authentication Middleware

  This middleware validates Bearer tokens from the Authorization header.
  When a valid token is provided, it sets req.locals.basicAuthValid = true
  to allow bypassing x402 middleware.
*/

import config from '../config/index.js'
import wlogger from '../adapters/wlogger.js'

/**
 * Middleware function that validates Bearer token authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function basicAuthMiddleware (req, res, next) {
  // Initialize req.locals if it doesn't exist
  if (!req.locals) {
    req.locals = {}
  }

  // Default to false
  req.locals.basicAuthValid = false

  // Get the configured token
  const configuredToken = config.basicAuth?.token

  // If no token is configured, skip validation
  if (!configuredToken) {
    wlogger.warn('Basic auth enabled but no BASIC_AUTH_TOKEN configured')
    return next()
  }

  // Get the Authorization header
  const authHeader = req.headers.authorization

  // If no Authorization header, continue (x402 will handle unauthorized requests)
  if (!authHeader) {
    return next()
  }

  // Check if it's a Bearer token
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next()
  }

  const providedToken = parts[1]

  // Debug logging
  wlogger.verbose(`Basic auth check: providedToken="${providedToken}", configuredToken="${configuredToken}", path="${req.path}"`)

  // Compare tokens
  if (providedToken === configuredToken) {
    req.locals.basicAuthValid = true
    wlogger.verbose(`Basic auth validated for request to ${req.path}`)
  } else {
    wlogger.verbose(`Basic auth failed: token mismatch for request to ${req.path}`)
  }

  // Always continue to next middleware
  // If auth failed, x402 middleware will handle the request
  next()
}
