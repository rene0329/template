import PrivacyComputing from '@/views/ManagementCenter/PrivacyComputing/index.vue'
import {
  approvePrivacyJob,
  fetchPrivacyJob,
  fetchPrivacyJobEvents,
  preflightPrivacyJob,
  rejectPrivacyJob
} from '@/api/privacyComputingApi'

jest.mock('@/api/registrationApi', () => ({ fetchRegisteredDatasets: jest.fn() }))
jest.mock('@/api/privacyComputingApi', () => ({
  approvePrivacyJob: jest.fn(),
  cancelPrivacyJob: jest.fn(),
  createPrivacyJob: jest.fn(),
  fetchPrivacyCapabilities: jest.fn(),
  fetchPrivacyJob: jest.fn(),
  fetchPrivacyJobEvents: jest.fn(),
  fetchPrivacyJobEvidence: jest.fn(),
  fetchPrivacyJobResult: jest.fn(),
  fetchPrivacyJobs: jest.fn(),
  fetchPrivacyTemplates: jest.fn(),
  preflightPrivacyJob: jest.fn(),
  privacyRequestId: jest.fn(() => 'privacy-request-1'),
  rejectPrivacyJob: jest.fn(),
  retryPrivacyJob: jest.fn()
}))

function context() {
  const vm = {
    ...PrivacyComputing.data(),
    $message: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
    $confirm: jest.fn().mockResolvedValue('confirm')
  }
  Object.entries(PrivacyComputing.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(PrivacyComputing.computed).forEach(([name, get]) => {
    Object.defineProperty(vm, name, { get: () => get.call(vm) })
  })
  return vm
}

const template = (templateId, participantCount, securityProfile = 'SEMI_HONEST') => ({
  templateId, participantCount, securityProfile, available: true,
  maxTimeoutSeconds: templateId.startsWith('hfl-') || templateId.startsWith('vfl-') ? 3600 : 1800
})

const usableDataset = (datasetId = 9, fields = ['value']) => ({
  datasetId,
  version: '1.0',
  authoritativeSha256: 'a'.repeat(64),
  schema: { columns: fields },
  replicas: [{ checksumAlgorithm: 'SHA-256', checksum: 'b'.repeat(64), effectiveAvailability: 'USABLE' }]
})

beforeEach(() => jest.resetAllMocks())

it('builds the malicious 3PC spec without client-owned digest or generic downgrade flags', () => {
  const vm = context()
  vm.templates = [template('secure-sum-3p-v1', 3, 'MALICIOUS_3PC')]
  vm.datasets = [usableDataset()]
  vm.partySecrets.A = 'alpha-secret'
  vm.jobForm.templateId = 'secure-sum-3p-v1'
  vm.applyTemplate('secure-sum-3p-v1')
  vm.jobForm.participants.forEach(participant => {
    participant.datasetId = 9
    vm.syncParticipantDataset(participant)
  })

  const spec = vm.buildJobSpec()
  expect(spec).toMatchObject({
    templateId: 'secure-sum-3p-v1',
    securityProfile: 'MALICIOUS_3PC',
    participants: [
      { partyId: 'A', role: 'PARTY', datasetId: '9', datasetVersion: '1.0', fields: ['value'] },
      { partyId: 'B', role: 'PARTY', datasetId: '9', datasetVersion: '1.0', fields: ['value'] },
      { partyId: 'C', role: 'PARTY', datasetId: '9', datasetVersion: '1.0', fields: ['value'] }
    ],
    resultRecipients: ['A'],
    enginePolicy: {}
  })
  expect(JSON.stringify(spec)).not.toContain('datasetSha256')
  expect(JSON.stringify(spec)).not.toContain('allowSecurityDowngrade')
  expect(vm.canPreflight).toBe(true)
})

it('uses only catalog authority or explicitly USABLE replicas for the displayed digest', () => {
  const vm = context()
  const authority = usableDataset()
  expect(vm.datasetDigest(authority)).toBe('a'.repeat(64))
  expect(vm.datasetDigest({ replicas: [
    { checksumAlgorithm: 'SHA-256', checksum: 'c'.repeat(64), availability: 'AVAILABLE' },
    { checksumAlgorithm: 'SHA-256', checksum: 'd'.repeat(64), effectiveAvailability: 'MISSING' }
  ] })).toBe('')
  expect(vm.datasetDigest({ replicas: [
    { checksumAlgorithm: 'SHA-256', checksum: 'e'.repeat(64), effectiveAvailability: 'USABLE' }
  ] })).toBe('e'.repeat(64))
})

it('extracts named schema fields and limits manual bindings to those fields', () => {
  const vm = context()
  const dataset = {
    datasetId: 12,
    schema: { properties: { id: { type: 'string' }, value: { type: 'number' }}, columns: ['label'] }
  }
  vm.datasets = [dataset]
  expect(vm.datasetFields(dataset)).toEqual(['id', 'label', 'value'])
  expect(vm.participantFieldOptions({ datasetId: 12 })).toEqual(['id', 'label', 'value'])
})

it('provides dedicated allowlisted defaults for all nine templates', () => {
  const vm = context()
  expect(vm.defaultEnginePolicy('secure-sum-3p-v1')).toEqual({})
  expect(vm.defaultEnginePolicy('private-stats-3p-v1')).toEqual({ scale: 1000 })
  expect(vm.defaultEnginePolicy('private-threshold-3p-v1')).toEqual({
    programId: 'topic4_private_threshold_100', threshold: 100, scale: 1
  })
  expect(vm.defaultEnginePolicy('psi-2p-v1')).toEqual({ keyColumns: ['id'], outputMode: 'RECEIVER_ONLY' })
  expect(vm.defaultEnginePolicy('psi-3p-v1')).toEqual({ keyColumns: ['id'], outputMode: 'RECEIVER_ONLY' })
  expect(vm.defaultEnginePolicy('pir-keyword-2p-v1')).toEqual({ queryColumn: 'query', valueColumns: ['value'] })
  expect(vm.defaultEnginePolicy('he-paillier-2p-v1')).toEqual({ operation: 'ADD', scale: 1000 })
  expect(vm.defaultEnginePolicy('hfl-fedavg-logreg-3p-v1')).toEqual({
    labelColumn: 'label', featureColumns: ['features'], epochs: 10, learningRate: 0.1, seed: 20260919
  })
  expect(vm.defaultEnginePolicy('vfl-secureboost-2p-v1')).toEqual({
    labelColumn: 'label', featureColumns: ['features'], epochs: 10, learningRate: 0.1, seed: 20260919
  })
})

it('derives result recipients from the template output mode', () => {
  const vm = context()
  vm.templates = [template('psi-3p-v1', 3)]
  vm.jobForm.templateId = 'psi-3p-v1'
  vm.applyTemplate('psi-3p-v1')
  expect(vm.jobForm.resultRecipients).toEqual(['A'])
  vm.jobForm.enginePolicy.outputMode = 'ALL_PARTIES'
  vm.onOutputModeChange()
  expect(vm.jobForm.resultRecipients).toEqual(['A', 'B', 'C'])
  vm.templates = [template('pir-keyword-2p-v1', 2)]
  vm.jobForm.templateId = 'pir-keyword-2p-v1'
  vm.applyTemplate('pir-keyword-2p-v1')
  expect(vm.jobForm.resultRecipients).toEqual(['A'])
})

it('preflights with the selected initiator credentials and invalidates creation when the spec changes', async() => {
  const vm = context()
  vm.templates = [template('secure-sum-3p-v1', 3, 'MALICIOUS_3PC')]
  vm.jobForm.templateId = 'secure-sum-3p-v1'
  vm.applyTemplate('secure-sum-3p-v1')
  vm.createPrincipal = 'B'
  vm.onCreatePrincipalChange()
  vm.partySecrets.B = 'bravo-secret'
  vm.jobForm.participants.forEach(item => {
    item.datasetId = 1
    item.datasetVersion = 'v1'
    item.displaySha256 = 'b'.repeat(64)
    item.fields = ['value']
  })
  preflightPrivacyJob.mockResolvedValue({ valid: true, errors: [], warnings: [], specDigest: 'sha256:spec' })

  await vm.runPreflight()
  expect(preflightPrivacyJob).toHaveBeenCalledWith(vm.buildJobSpec(), { partyId: 'B', secret: 'bravo-secret' })
  expect(vm.jobForm.resultRecipients).toEqual(['B'])
  expect(vm.canCreate).toBe(true)
  vm.jobForm.participants[0].fields = ['different']
  expect(vm.canCreate).toBe(false)
})

it('invalidates preflight when the selected initiator or its credential changes', () => {
  const vm = context()
  vm.templates = [template('secure-sum-3p-v1', 3, 'MALICIOUS_3PC_HONEST_MAJORITY')]
  vm.jobForm.templateId = 'secure-sum-3p-v1'
  vm.applyTemplate('secure-sum-3p-v1')
  vm.preflight = { valid: true }
  vm.preflightSpecJson = '{}'
  vm.createPrincipal = 'C'
  vm.onCreatePrincipalChange()
  expect(vm.jobForm.resultRecipients).toEqual(['C'])
  expect(vm.preflight).toBeNull()
  vm.preflight = { valid: true }
  vm.onSecretChange('C')
  expect(vm.preflight).toBeNull()
})

it('uses only current-attempt approvals and ignores stale approval events', () => {
  const vm = context()
  vm.selectedJob = {
    attemptId: 'attempt-2',
    participants: [{ partyId: 'A' }, { partyId: 'B' }],
    approvals: [{ participantId: 'A', decision: 'APPROVED' }]
  }
  vm.events = [
    { attemptId: 'attempt-1', participantId: 'B', phase: 'APPROVAL', status: 'APPROVED' },
    { attemptId: 'attempt-2', participantId: 'B', phase: 'APPROVAL', status: 'REJECTED' }
  ]
  expect(vm.approvalState(vm.jobParticipants[0])).toBe('APPROVED')
  expect(vm.approvalState(vm.jobParticipants[1])).toBe('REJECTED')
  vm.events = vm.events.slice(0, 1)
  expect(vm.approvalState(vm.jobParticipants[1])).toBe('PENDING')
})

it('approves and rejects with the affected party secret', async() => {
  const vm = context()
  vm.partySecrets.B = 'bravo-secret'
  vm.partySecrets.C = 'charlie-secret'
  vm.selectedJob = { jobId: 'job-1', attemptId: 'attempt-1', status: 'AWAITING_APPROVAL', participants: [
    { partyId: 'B', role: 'PROVIDER' }, { partyId: 'C', role: 'PROVIDER' }
  ] }
  vm.decisionReason = 'checked'
  fetchPrivacyJob.mockResolvedValue(vm.selectedJob)
  fetchPrivacyJobEvents.mockResolvedValue([])
  vm.loadJobs = jest.fn().mockResolvedValue()

  await vm.decideParticipant('approve', vm.jobParticipants[0])
  expect(approvePrivacyJob).toHaveBeenCalledWith('job-1', 'B', 'checked', { partyId: 'B', secret: 'bravo-secret' })
  expect(fetchPrivacyJob).toHaveBeenCalledWith('job-1', { partyId: 'B', secret: 'bravo-secret' }, {})

  vm.selectedJob = { jobId: 'job-2', attemptId: 'attempt-1', status: 'AWAITING_APPROVAL', participants: [{ partyId: 'C' }] }
  vm.decisionReason = 'policy rejected'
  fetchPrivacyJob.mockResolvedValue(vm.selectedJob)
  await vm.decideParticipant('reject', vm.jobParticipants[0])
  expect(rejectPrivacyJob).toHaveBeenCalledWith('job-2', 'C', 'policy rejected', { partyId: 'C', secret: 'charlie-secret' })
})

it('clears protected state when credentials or the active identity changes', async() => {
  const vm = context()
  vm.partySecrets.A = 'alpha-secret'
  vm.actionPrincipal = 'A'
  vm.artifactPrincipal = 'A'
  vm.jobs = [{ jobId: 'job-1' }]
  vm.selectedJob = vm.jobs[0]
  vm.events = [{ eventId: 1 }]
  vm.resultData = { value: 145 }
  vm.evidenceData = { evidenceDigest: 'abc' }
  vm.onSecretChange('A')
  expect(vm.jobs).toEqual([])
  expect(vm.selectedJob).toBeNull()
  expect(vm.resultData).toBeNull()
  expect(vm.evidenceData).toBeNull()

  vm.partySecrets.B = 'bravo-secret'
  vm.actionPrincipal = 'B'
  vm.loadJobs = jest.fn().mockResolvedValue()
  await vm.onActionPrincipalChange()
  expect(vm.artifactPrincipal).toBe('B')
  expect(vm.loadJobs).toHaveBeenCalledTimes(1)
})
