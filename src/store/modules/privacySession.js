const emptySecrets = () => ({ A: '', B: '', C: '' })

const state = {
  activeParty: 'A',
  secrets: emptySecrets()
}

const mutations = {
  SET_ACTIVE_PARTY(current, partyId) {
    if (['A', 'B', 'C'].includes(partyId)) current.activeParty = partyId
  },
  SET_SECRET(current, { partyId, secret }) {
    if (['A', 'B', 'C'].includes(partyId)) current.secrets[partyId] = String(secret || '')
  },
  CLEAR(current) {
    current.activeParty = 'A'
    current.secrets = emptySecrets()
  }
}

const actions = {
  setActiveParty({ commit }, partyId) { commit('SET_ACTIVE_PARTY', partyId) },
  setSecret({ commit }, payload) { commit('SET_SECRET', payload) },
  clear({ commit }) { commit('CLEAR') }
}

const getters = {
  hasCredential: current => partyId => Boolean(current.secrets[partyId]),
  credentialsFor: current => partyId => ({ partyId, secret: current.secrets[partyId] || '' }),
  connectedParties: current => Object.keys(current.secrets).filter(partyId => Boolean(current.secrets[partyId]))
}

export default { namespaced: true, state, mutations, actions, getters }
