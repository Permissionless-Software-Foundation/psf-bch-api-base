/*
  Use cases for interacting with the BCH full node double-spend proof RPC interface.
*/

class DSProofUseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error('Adapters instance required when instantiating DSProof use cases.')
    }

    this.fullNode = this.adapters.fullNode
    if (!this.fullNode) {
      throw new Error('Full node adapter required when instantiating DSProof use cases.')
    }
  }

  async getDSProof ({ txid, verbose }) {
    return this.fullNode.call('getdsproof', [txid, verbose])
  }
}

export default DSProofUseCases
