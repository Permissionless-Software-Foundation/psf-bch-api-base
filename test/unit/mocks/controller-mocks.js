/*
  Mock Express request/response objects for controller unit tests.
*/

// Mock Express request object
export function createMockRequest (overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    method: 'GET',
    path: '/',
    ...overrides
  }
}

// Mock Express response object
export function createMockResponse () {
  const res = {
    statusCode: 200,
    jsonData: null,
    statusValue: null,
    headers: {},
    writeData: [],
    endCalled: false,
    writable: true, // Stream is writable by default
    destroyed: false, // Stream is not destroyed by default
    closed: false, // Stream is not closed by default
    eventHandlers: {} // Store event handlers
  }

  res.status = function (code) {
    res.statusCode = code
    res.statusValue = code
    return res
  }

  res.json = function (data) {
    res.jsonData = data
    return res
  }

  res.setHeader = function (name, value) {
    res.headers[name] = value
    return res
  }

  res.write = function (data) {
    res.writeData.push(data)
    return true
  }

  res.end = function () {
    res.endCalled = true
    return res
  }

  res.on = function (event, callback) {
    // Store event handlers for different event types
    if (!res.eventHandlers[event]) {
      res.eventHandlers[event] = []
    }
    res.eventHandlers[event].push(callback)

    // For backward compatibility with existing tests
    if (event === 'close') {
      res.closeCallback = callback
    }

    return res
  }

  // Helper to trigger an event (useful for testing)
  res.trigger = function (event, ...args) {
    if (res.eventHandlers[event]) {
      for (const handler of res.eventHandlers[event]) {
        handler(...args)
      }
    }
  }

  return res
}

// Helper to create a mock request with body
export function createMockRequestWithBody (body) {
  return createMockRequest({ body })
}

// Helper to create a mock request with params
export function createMockRequestWithParams (params) {
  return createMockRequest({ params })
}

// Helper to create a mock request with query
export function createMockRequestWithQuery (query) {
  return createMockRequest({ query })
}
