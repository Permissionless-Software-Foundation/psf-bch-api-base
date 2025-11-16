/*
  Use cases for interacting with the BCH full node mining RPC interface.
*/

class MiningUseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error('Adapters instance required when instantiating Mining use cases.')
    }

    this.fullNode = this.adapters.fullNode
    if (!this.fullNode) {
      throw new Error('Full node adapter required when instantiating Mining use cases.')
    }
  }

  async getMiningInfo () {
    return this.fullNode.call('getmininginfo')
  }

  async getNetworkHashPS ({ nblocks, height }) {
    return this.fullNode.call('getnetworkhashps', [nblocks, height])
  }
}

export default MiningUseCases
