import fs from 'fs'
import path from 'path'

const topicRoot = path.resolve(__dirname, '../../../..')
const read = relativePath => fs.readFileSync(path.join(topicRoot, relativePath), 'utf8')
const backendControllerPath = 'data-discovery/practice-server/src/main/java/org/example/controller/registration/PrivacyComputeController.java'
const hasBackendCheckout = fs.existsSync(path.join(topicRoot, backendControllerPath))
const crossRepoIt = hasBackendCheckout ? it : it.skip

const backendRead = relativePath => hasBackendCheckout ? read(relativePath) : ''
const controller = backendRead(backendControllerPath)
const authenticator = backendRead('data-discovery/practice-server/src/main/java/org/example/privacy/PrivacyPartyAuthenticator.java')
const resolver = backendRead('data-discovery/practice-server/src/main/java/org/example/privacy/PrivacyJobSpecResolver.java')
const models = backendRead('data-discovery/practice-server/src/main/java/org/example/privacy/PrivacyComputeModels.java')
const registeredDataset = backendRead('data-discovery/practice-server/src/main/java/org/example/dto/registration/RegisteredDatasetView.java')
const apiClient = read('template/src/api/privacyComputingApi.js')
const page = read('template/src/views/ManagementCenter/PrivacyComputing/index.vue')

function endpointBlock(mapping) {
  const start = controller.indexOf(mapping)
  if (start < 0) throw new Error(`missing controller mapping: ${mapping}`)
  const next = controller.indexOf('\n    @', start + mapping.length)
  return controller.slice(start, next < 0 ? controller.length : next)
}

crossRepoIt('keeps only the capability catalog public and authenticates every job endpoint with Basic credentials', () => {
  expect(endpointBlock('@GetMapping("/capabilities")')).not.toContain('Authorization')
  expect(endpointBlock('@GetMapping("/templates")')).not.toContain('Authorization')

  const protectedMappings = [
    '@PostMapping("/jobs/preflight")',
    '@PostMapping("/jobs")',
    '@GetMapping("/jobs")',
    '@GetMapping("/jobs/{jobId}")',
    '@GetMapping("/jobs/{jobId}/events")',
    '@GetMapping("/jobs/{jobId}/result")',
    '@GetMapping("/jobs/{jobId}/evidence")',
    '@PostMapping("/jobs/{jobId}/approve")',
    '@PostMapping("/jobs/{jobId}/reject")',
    '@PostMapping("/jobs/{jobId}/cancel")',
    '@PostMapping("/jobs/{jobId}/retry")'
  ]
  protectedMappings.forEach(mapping => {
    const block = endpointBlock(mapping)
    expect(block).toMatch(/@RequestHeader\((?:value = )?"Authorization"/)
    expect(block).toContain('authenticator.authenticate(authorization)')
  })

  expect(authenticator).toContain('"Basic "')
  expect(authenticator).toContain('MessageDigest.isEqual(expected, supplied)')
  expect(apiClient).toContain('const authorizationFor')
  expect(apiClient).toContain('Authorization: authorization')
  expect(apiClient).not.toContain('X-Privacy-Principal')
})

crossRepoIt('keeps the frontend engine policies aligned with the backend template allowlists', () => {
  const allowedPolicies = [
    ['private-stats-3p-v1', ['scale']],
    ['private-threshold-3p-v1', ['programId', 'threshold', 'scale']],
    ['template.startsWith("psi-")', ['keyColumns', 'outputMode']],
    ['pir-keyword-2p-v1', ['queryColumn', 'valueColumns']],
    ['he-paillier-2p-v1', ['operation', 'scale']],
    ['template.startsWith("hfl-") || template.startsWith("vfl-")',
      ['labelColumn', 'featureColumns', 'epochs', 'learningRate', 'seed']]
  ]
  allowedPolicies.forEach(([templateMarker, keys]) => {
    expect(resolver).toContain(templateMarker)
    keys.forEach(key => {
      expect(resolver).toContain(`"${key}"`)
      expect(page).toContain(key)
    })
  })
  expect(page).not.toContain('allowSecurityDowngrade')
  expect(page).not.toContain('requireAllParties')
  expect(page).not.toContain('datasetSha256')
})

crossRepoIt('exposes current-attempt approvals and authoritative catalog metadata consumed by the page', () => {
  expect(models).toContain('private List<ApprovalView> approvals = new ArrayList<>();')
  expect(models).toContain('public List<ApprovalView> getApprovals()')
  ;['authoritativeSha256', 'authoritativeSizeBytes', 'schema', 'schemaDigest'].forEach(field => {
    expect(registeredDataset).toContain(field)
  })
  expect(page).toContain('authoritativeSha256')
  expect(page).toContain('dataset.schema')
  expect(page).toContain('selectedJob.approvals')
  expect(page).toContain('item.attemptId === this.selectedJob.attemptId')
})
