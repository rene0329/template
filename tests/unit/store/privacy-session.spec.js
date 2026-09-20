import privacySession from '@/store/modules/privacySession'

const freshState = () => ({ activeParty: 'A', secrets: { A: '', B: '', C: '' }})

describe('privacy session store', () => {
  it('keeps participant credentials in Vuex memory and exposes connected parties', () => {
    const state = freshState()
    privacySession.mutations.SET_SECRET(state, { partyId: 'B', secret: 'bravo' })
    privacySession.mutations.SET_ACTIVE_PARTY(state, 'B')
    expect(state).toEqual({ activeParty: 'B', secrets: { A: '', B: 'bravo', C: '' }})
    expect(privacySession.getters.connectedParties(state)).toEqual(['B'])
    expect(privacySession.getters.credentialsFor(state)('B')).toEqual({ partyId: 'B', secret: 'bravo' })
  })

  it('clears credentials and rejects unknown party identifiers', () => {
    const state = { activeParty: 'C', secrets: { A: 'alpha', B: 'bravo', C: 'charlie' }}
    privacySession.mutations.SET_SECRET(state, { partyId: 'D', secret: 'ignored' })
    privacySession.mutations.SET_ACTIVE_PARTY(state, 'D')
    privacySession.mutations.CLEAR(state)
    expect(state).toEqual(freshState())
  })
})
