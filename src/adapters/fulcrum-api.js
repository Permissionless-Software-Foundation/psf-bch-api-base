/*
  Adapter library for interacting with Fulcrum API service over HTTP.
*/

import axios from 'axios'
import wlogger from './wlogger.js'
import config from '../config/index.js'

class FulcrumAPIAdapter {
  constructor (localConfig = {}) {
    this.config = localConfig.config || config

    // Allow missing config for testing environments
    if (!this.config.fulcrumApi || !this.config.fulcrumApi.baseUrl) {
      if (process.env.NODE_ENV === 'test' || process.env.TEST) {
        // In test environment, create a mock baseURL
        this.config.fulcrumApi = {
          baseUrl: 'http://localhost:50001',
          timeoutMs: 15000
        }
      } else {
        throw new Error('FULCRUM_API env var not set. Can not connect to Fulcrum indexer.')
      }
    }

    const {
      baseUrl,
      timeoutMs = 15000
    } = this.config.fulcrumApi

    this.http = axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs
    })
  }

  async get (path) {
    try {
      const response = await this.http.get(path)
      return response.data
    } catch (err) {
      throw this._handleError(err)
    }
  }

  async post (path, data) {
    try {
      const response = await this.http.post(path, data)
      return response.data
    } catch (err) {
      throw this._handleError(err)
    }
  }

  _handleError (err) {
    const { status, message } = this.decodeError(err)
    const error = new Error(message)
    error.status = status
    error.originalError = err
    return error
  }

  decodeError (err) {
    try {
      // Attempt to extract error message from response data
      if (err.response && err.response.data) {
        const data = err.response.data
        // Handle structured error responses
        if (data.error) {
          return this._formatError(data.error, err.response.status || 400)
        }
        // Handle string error messages
        if (typeof data === 'string') {
          return this._formatError(data, err.response.status || 400)
        }
        // Handle object responses that might contain error info
        if (typeof data === 'object' && data.message) {
          return this._formatError(data.message, err.response.status || 400)
        }
        // Fallback to returning the status
        return this._formatError('Fulcrum API error', err.response.status || 500)
      }

      // Network errors
      if (err.message) {
        if (err.message.includes('ENOTFOUND') || err.message.includes('ENETUNREACH') || err.message.includes('EAI_AGAIN')) {
          return this._formatError(
            'Network error: Could not communicate with Fulcrum API service.',
            503
          )
        }
      }

      if (err.code && (err.code === 'ECONNABORTED' || err.code === 'ECONNREFUSED')) {
        return this._formatError(
          'Network error: Could not communicate with Fulcrum API service.',
          503
        )
      }

      if (err.error && typeof err.error === 'string' && err.error.includes('429')) {
        return this._formatError('429 Too Many Requests', 429)
      }

      if (err.message) {
        return this._formatError(err.message, err.status || 422)
      }

      return this._formatError('Unhandled Fulcrum API error', 500)
    } catch (decodeError) {
      wlogger.error('Unhandled error in FulcrumAPIAdapter.decodeError()', decodeError)
      return this._formatError('Internal server error', 500)
    }
  }

  _formatError (message, status = 500) {
    return {
      message: message || 'Internal server error',
      status: status || 500
    }
  }
}

export default FulcrumAPIAdapter
