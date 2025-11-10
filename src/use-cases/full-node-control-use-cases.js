/*
  Use cases for interacting with the BCH full node control RPC interface.
*/

class ControlUseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error('Adapters instance required when instantiating Control use cases.')
    }

    this.fullNode = this.adapters.fullNode
    if (!this.fullNode) {
      throw new Error('Full node adapter required when instantiating Control use cases.')
    }
  }

  async getNetworkInfo () {
    return this.fullNode.call('getnetworkinfo')
  }
}

export default ControlUseCases
