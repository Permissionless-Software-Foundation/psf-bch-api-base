/*
  Express server for psf-bch-api REST API.
  The architecture of the code follows the Clean Architecture pattern.
*/

// npm libraries
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { paymentMiddleware as x402PaymentMiddleware } from 'x402-bch-express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Local libraries
import config from '../src/config/index.js'
import Controllers from '../src/controllers/index.js'
import wlogger from '../src/adapters/wlogger.js'
import { buildX402Routes, getX402Settings, getBasicAuthSettings } from '../src/config/x402.js'
import { basicAuthMiddleware } from '../src/middleware/basic-auth.js'
import DiscoveryRouter from '../src/controllers/discovery/router.js'

// Load environment variables
dotenv.config()

// Set up global error handlers to prevent server crashes
// These must be set up before the server starts to catch any unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  wlogger.error('Unhandled Rejection:', {
    promise: promise.toString(),
    reason: reason instanceof Error ? reason.stack : String(reason)
  })
  // Don't exit the process - log and continue
  // The server should remain running to handle other requests
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  wlogger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack
  })
  // For uncaught exceptions, we should exit gracefully
  // but give time for the process manager to restart
  console.log('Exiting after 5 seconds due to uncaught exception. Process manager should restart.')
  setTimeout(() => {
    process.exit(1)
  }, 5000)
})

class Server {
  constructor () {
    // Encapsulate dependencies
    this.controllers = new Controllers()
    this.config = config
    this.process = process
  }

  async startServer () {
    try {
      // Create an Express instance.
      const app = express()
      app.set('trust proxy', true)

      const x402Settings = getX402Settings()
      const basicAuthSettings = getBasicAuthSettings()

      // MIDDLEWARE START
      app.use(express.json())
      app.use(express.urlencoded({ extended: true }))

      app.use(cors({
        origin: true, // Allow all origins (more reliable than '*')
        credentials: false, // Set to true if you need to support credentials
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }))

      // URL normalization middleware - collapse multiple slashes
      app.use((req, res, next) => {
        if (req.url && req.url.includes('//')) {
          // Split URL into path and query string
          const [path, queryString] = req.url.split('?')
          // Collapse multiple consecutive slashes into a single slash
          const normalizedPath = path.replace(/\/+/g, '/')
          // Reconstruct req.url with normalized path (req.path is read-only and will auto-update)
          req.url = queryString ? `${normalizedPath}?${queryString}` : normalizedPath
        }
        next()
      })

      // Apply basic auth middleware if enabled
      // This must run before x402 middleware to set req.locals.basicAuthValid
      if (basicAuthSettings.enabled) {
        wlogger.info('Basic auth middleware enabled')
        app.use(basicAuthMiddleware)
      }

      // Apply x402 middleware based on configuration
      // Logic:
      // - If X402_ENABLED=true AND USE_BASIC_AUTH=true: Apply x402 conditionally (bypass if basic auth valid)
      // - If X402_ENABLED=true AND USE_BASIC_AUTH=false: Apply x402 unconditionally (no basic auth bypass)
      // - If X402_ENABLED=false AND USE_BASIC_AUTH=true: Require basic auth only
      // - If X402_ENABLED=false AND USE_BASIC_AUTH=false: No access control

      // Apply access control middleware based on configuration
      if (x402Settings.enabled && basicAuthSettings.enabled) {
        // X402_ENABLED=true AND USE_BASIC_AUTH=true: Apply x402 conditionally
        const routes = buildX402Routes(this.config.apiPrefix)
        const facilitatorOptions = x402Settings.facilitatorUrl
          ? { url: x402Settings.facilitatorUrl }
          : undefined

        wlogger.info(`x402 middleware enabled with basic auth bypass; enforcing ${x402Settings.priceSat} satoshis per request (unless basic auth provided)`)

        // Create conditional x402 middleware that bypasses if basic auth is valid
        const conditionalX402Middleware = (req, res, next) => {
          // If basic auth is valid, bypass x402
          if (req.locals?.basicAuthValid === true) {
            return next()
          }

          // Otherwise, apply x402 middleware
          return x402PaymentMiddleware(
            x402Settings.serverAddress,
            routes,
            facilitatorOptions
          )(req, res, next)
        }

        app.use(conditionalX402Middleware)
      } else if (x402Settings.enabled && !basicAuthSettings.enabled) {
        // X402_ENABLED=true AND USE_BASIC_AUTH=false: Apply x402 unconditionally (no basic auth bypass)
        const routes = buildX402Routes(this.config.apiPrefix)
        const facilitatorOptions = x402Settings.facilitatorUrl
          ? { url: x402Settings.facilitatorUrl }
          : undefined

        wlogger.info(`x402 middleware enabled (basic auth disabled); enforcing ${x402Settings.priceSat} satoshis per request`)

        // Apply x402 middleware unconditionally - no basic auth bypass
        app.use(x402PaymentMiddleware(
          x402Settings.serverAddress,
          routes,
          facilitatorOptions
        ))
      } else if (basicAuthSettings.enabled && !x402Settings.enabled) {
        // USE_BASIC_AUTH=true AND X402_ENABLED=false: Require basic auth, reject unauthenticated requests
        wlogger.info('Basic auth enforcement enabled (x402 disabled)')

        // Middleware that rejects requests without valid basic auth
        const requireBasicAuthMiddleware = (req, res, next) => {
          // Skip auth check for health endpoint and root
          if (req.path === '/health' || req.path === '/') {
            return next()
          }

          // If basic auth is valid, allow the request
          if (req.locals?.basicAuthValid === true) {
            return next()
          }

          // Reject unauthenticated requests
          wlogger.warn(`Unauthenticated request rejected: ${req.method} ${req.path}`)
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Valid Bearer token required in Authorization header'
          })
        }

        app.use(requireBasicAuthMiddleware)
      } else {
        // X402_ENABLED=false AND USE_BASIC_AUTH=false: No access control middleware
        wlogger.info('No access control middleware enabled')
      }

      // Endpoint logging middleware
      app.use((req, res, next) => {
        console.log(`Endpoint called: ${req.method} ${req.path} by ${req.ip}`)
        res.on('finish', () => {
          console.log(`Endpoint responded: ${req.method} ${req.path} - ${res.statusCode}`)
        })
        next()
      })

      // Request logging middleware
      app.use((req, res, next) => {
        wlogger.info(`${req.method} ${req.path}`, {
          client_ip: req.ip,
          remote_address: req.socket?.remoteAddress || null
        })
        next()
      })

      // Error handling middleware
      app.use((err, req, res, next) => {
        wlogger.error('Express error:', err)

        // Handle JSON parsing errors
        if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
          return res.status(400).json({
            error: 'Invalid JSON in request body'
          })
        }

        // Default to 500 for other errors
        res.status(500).json({
          error: err.message || 'Internal server error'
        })
      })

      // Wait for any adapters to initialize.
      await this.controllers.initAdapters()

      // Wait for any use-libraries to initialize.
      await this.controllers.initUseCases()

      // Attach REST API controllers to the app.
      this.controllers.attachRESTControllers(app)
      const discoveryRouter = new DiscoveryRouter()
      discoveryRouter.attach(app)

      // Initialize any other controller libraries.
      this.controllers.initControllers()

      // Serve static assets from docs directory
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      app.use('/assets', express.static(join(__dirname, '..', 'docs', 'assets')))

      // Health check endpoint
      app.get('/health', (req, res) => {
        res.json({
          status: 'ok',
          service: 'rest2nostr',
          version: config.version
        })
      })

      // Root endpoint
      app.get('/', (req, res) => {
        const docsPath = join(__dirname, '..', 'docs', 'index.html')
        res.sendFile(docsPath)
      })

      // MIDDLEWARE END

      console.log(`Running server in environment: ${this.config.env}`)
      wlogger.info(`Running server in environment: ${this.config.env}`)

      this.server = app.listen(this.config.port, () => {
        console.log(`Server started on port ${this.config.port}`)
        wlogger.info(`Server started on port ${this.config.port}`)
      })

      // Explicit timeout settings reduce stale keep-alive socket reuse races.
      this.server.keepAliveTimeout = this.config.serverKeepAliveTimeoutMs
      this.server.headersTimeout = this.config.serverHeadersTimeoutMs
      this.server.requestTimeout = this.config.serverRequestTimeoutMs

      this.server.on('error', (err) => {
        console.error('Server error:', err)
        wlogger.error('Server error:', err)
      })

      this.server.on('close', () => {
        console.log('Server closed')
        wlogger.info('Server closed')
      })

      return app
    } catch (err) {
      console.error('Could not start server. Error: ', err)
      wlogger.error('Could not start server. Error: ', err)

      console.log(
        'Exiting after 5 seconds. Depending on process manager to restart.'
      )
      await this.sleep(5000)
      this.process.exit(1)
    }
  }

  sleep (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Start the server if this file is run directly
const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] === __filename) {
  const server = new Server()
  server.startServer().catch(err => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })
}

export default Server
