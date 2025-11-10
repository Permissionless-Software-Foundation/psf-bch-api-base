/*
  Express server for REST2NOSTR Proxy API.
  The architecture of the code follows the Clean Architecture pattern.
*/

// npm libraries
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Local libraries
import config from '../src/config/index.js'
import Controllers from '../src/controllers/index.js'
import wlogger from '../src/adapters/wlogger.js'

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

      // MIDDLEWARE START
      app.use(express.json())
      app.use(express.urlencoded({ extended: true }))

      app.use(cors({
        origin: true, // Allow all origins (more reliable than '*')
        credentials: false, // Set to true if you need to support credentials
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }))

      // Endpoint logging middleware
      app.use((req, res, next) => {
        console.log(`Endpoint called: ${req.method} ${req.path}`)
        res.on('finish', () => {
          console.log(`Endpoint responded: ${req.method} ${req.path} - ${res.statusCode}`)
        })
        next()
      })

      // Request logging middleware
      app.use((req, res, next) => {
        wlogger.info(`${req.method} ${req.path}`)
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
