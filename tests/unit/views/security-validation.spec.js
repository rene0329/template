import SecurityValidation from '@/views/ManagementCenter/SecurityValidation/index.vue'

jest.mock('@/api/registrationApi', () => ({
  fetchRegisteredDatasets: jest.fn(),
  fetchRegisteredNodes: jest.fn(),
  verifyDataset: jest.fn()
}))
jest.mock('@/api/securityValidationApi', () => ({
  authorizeDatasetAccess: jest.fn(),
  fetchDatasetAccessAuditEvents: jest.fn(),
  startSecureAggregation: jest.fn(),
  fetchSecureAggregationRun: jest.fn(),
  fetchSecureAggregationEvents: jest.fn()
}))

function context() {
  const vm = { ...SecurityValidation.data() }
  Object.entries(SecurityValidation.methods).forEach(([name, method]) => { vm[name] = method.bind(vm) })
  Object.entries(SecurityValidation.computed).forEach(([name, get]) => {
    Object.defineProperty(vm, name, { get: () => get.call(vm) })
  })
  return vm
}

it('derives the scoped access path and Kubernetes node from a usable replica', () => {
  const vm = context()
  vm.datasets = [{
    datasetId: 9,
    replicas: [
      { nodeId: 1, filePath: '/dataset/bad.bin', effectiveAvailability: 'MISSING', availability: 'AVAILABLE' },
      { nodeId: 2, filePath: '/dataset/good.bin', effectiveAvailability: 'USABLE', availability: 'AVAILABLE' }
    ]
  }]
  vm.nodes = [{ nodeId: 2, k8sNodeName: 'master-89' }]
  vm.access.datasetId = 9

  vm.syncAccessDefaults()

  expect(vm.access.path).toBe('/dataset/good.bin')
  expect(vm.access.targetNode).toBe('master-89')
})
