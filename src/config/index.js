import common from './env/common.js'

import development from './env/development.js'
import production from './env/production.js'

const env = process.env.NODE_ENV || 'development'
console.log(`Loading config for this environment: ${env}`)

let config = development
if (env === 'production') {
  config = production
}

export default Object.assign({}, common, config)
