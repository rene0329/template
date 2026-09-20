import PrivacyComputing from '@/views/ManagementCenter/PrivacyComputing/index.vue'

jest.mock('@/api/registrationApi', () => ({ fetchRegisteredDatasets: jest.fn() }))
jest.mock('@/api/privacyComputingApi', () => ({
  approvePrivacyJob: jest.fn(), cancelPrivacyJob: jest.fn(), createPrivacyJob: jest.fn(),
  fetchPendingPrivacyApprovals: jest.fn(), fetchPrivacyCapabilities: jest.fn(), fetchPrivacyJob: jest.fn(),
  fetchPrivacyJobEvidence: jest.fn(), fetchPrivacyJobEvents: jest.fn(), fetchPrivacyJobResult: jest.fn(),
  fetchPrivacyJobs: jest.fn(), fetchPrivacyTemplates: jest.fn(), preflightPrivacyJob: jest.fn(),
  privacyRequestId: jest.fn(() => 'privacy-request-1'), rejectPrivacyJob: jest.fn(), retryPrivacyJob: jest.fn()
}))

function context() {
  const vm = {
    ...PrivacyComputing.data(),
    $store: { getters: { roles: ['DATA_OWNER'], userId: 7 }},
    $route: { meta: {}, params: {}, path: '/collaboration/jobs/new' },
    $message: { success: jest.fn(), error: jest.fn() }
  }
  Object.entries(PrivacyComputing.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(PrivacyComputing.computed).forEach(([name, get]) => Object.defineProperty(vm, name, { configurable: true, get: () => get.call(vm) }))
  return vm
}

const template = (id, count) => ({ templateId: id, participantCount: count, securityProfile: 'SEMI_HONEST', available: true, maxTimeoutSeconds: 1800 })
const dataset = (id, domainId, ownerId, fields = ['id']) => ({ datasetId: id, version: 'v1', ownerUserId: ownerId, ownerUsername: `owner-${ownerId}`, ownerDomainId: domainId, ownerDomainName: `域 ${domainId}`, authoritativeSha256: 'a'.repeat(64), schema: { columns: fields }})

it('builds the new slot-based job request without client-selected parties or recipients', () => {
  const vm = context()
  vm.templates = [template('psi-2p-v1', 2)]
  vm.datasets = [dataset(11, 1, 21), dataset(12, 2, 22)]
  vm.jobForm.templateId = 'psi-2p-v1'
  vm.applyTemplate('psi-2p-v1')
  vm.jobForm.inputs.forEach((input, index) => { input.datasetId = 11 + index; vm.syncInputDataset(input) })
  expect(vm.buildJobSpec()).toEqual({
    templateId: 'psi-2p-v1',
    inputs: [
      { slotId: 'P0', datasetId: 11, datasetVersion: 'v1', fields: ['id'] },
      { slotId: 'P1', datasetId: 12, datasetVersion: 'v1', fields: ['id'] }
    ],
    timeoutSeconds: 1800,
    enginePolicy: { keyColumns: ['id'], outputMode: 'RECEIVER_ONLY' }
  })
  expect(JSON.stringify(vm.buildJobSpec())).not.toContain('partyId')
  expect(JSON.stringify(vm.buildJobSpec())).not.toContain('resultRecipients')
  expect(vm.canPreflight).toBe(true)
})

it('groups datasets by owner domain and rejects duplicate domains', () => {
  const vm = context()
  vm.templates = [template('psi-2p-v1', 2)]
  vm.datasets = [dataset(1, 8, 20), dataset(2, 8, 21), dataset(3, 9, 22), { datasetId: 4, version: 'v1' }]
  expect(vm.datasetGroups.map(group => group.key)).toEqual(['8:20', '8:21', '9:22'])
  vm.jobForm.templateId = 'psi-2p-v1'
  vm.applyTemplate('psi-2p-v1')
  vm.jobForm.inputs.forEach((input, index) => { input.datasetId = index + 1; vm.syncInputDataset(input) })
  expect(vm.domainConflict).toBe(true)
  expect(vm.canPreflight).toBe(false)
})

it('uses participantSlots from the backend and falls back to P0/P1/P2', () => {
  const vm = context()
  expect(vm.templateSlots({ participantSlots: [{ slotId: 'QUERY', role: 'QUERY' }, { slotId: 'SERVER', role: 'SERVER' }] })).toEqual([{ slotId: 'QUERY', role: 'QUERY' }, { slotId: 'SERVER', role: 'SERVER' }])
  expect(vm.templateSlots(template('psi-3p-v1', 3)).map(item => item.slotId)).toEqual(['P0', 'P1', 'P2'])
})

it('allows only the initiator to read a successful plaintext result', () => {
  const vm = context()
  vm.selectedJob = { jobId: 'job-1', status: 'SUCCEEDED', initiatorUserId: 7 }
  expect(vm.canReadResult).toBe(true)
  vm.$store.getters.userId = 9
  expect(vm.canReadResult).toBe(false)
})
