import SelectData from '@/views/ManagementCenter/SelectData/index.vue'
import request from '@/api/axiosConfig'

// node_modules are not transformed, so the stylesheet axiosConfig imports must be stubbed.
jest.mock('nprogress/nprogress.css', () => ({}))

// No API mocks here: the 403 travels through the real axios instance and its interceptors,
// so this checks where the backend's errorCode ends up on the rejected error object.
function context() {
  const vm = { ...SelectData.data(),
    $message: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
    $refs: { datasetTable: { clearSelection: jest.fn() }},
    $alert: jest.fn().mockResolvedValue()
  }
  Object.entries(SelectData.methods).forEach(([key, method]) => { vm[key] = method.bind(vm) })
  vm.selectedImageId = 9
  vm.selectedRows = [{ datasetId: 7 }]
  return vm
}

const originalAdapter = request.defaults.adapter
afterEach(() => { request.defaults.adapter = originalAdapter })

it('maps a 403 DATASET_ACCESS_DENIED response from task creation to the access-restricted message', async() => {
  const calls = []
  request.defaults.adapter = config => {
    calls.push(config.url)
    if (/\/preflight$/.test(config.url)) {
      return Promise.resolve({ status: 200, statusText: 'OK', headers: {}, config, data: { code: 0, data: { valid: true, checks: [] }}})
    }
    const body = { code: 403, msg: 'dataset access denied: 7', errorCode: 'DATASET_ACCESS_DENIED', data: null }
    return Promise.reject(Object.assign(new Error('Request failed with status code 403'), {
      config, response: { status: 403, statusText: 'Forbidden', headers: {}, config, data: body }
    }))
  }
  const vm = context()

  await vm.handleSubmit()

  expect(calls).toHaveLength(2)
  expect(calls[1]).toMatch(/\/api\/v1\/tasks$/)
  expect(vm.$message.error).toHaveBeenCalledTimes(1)
  expect(vm.$message.error).toHaveBeenCalledWith('任务创建失败，用户访问受限')
  expect(vm.submitResult).toBeNull()
})

it('exposes the backend error code as error.errorCode', async() => {
  request.defaults.adapter = config => Promise.reject(Object.assign(new Error('Request failed with status code 403'), {
    config, response: { status: 403, headers: {}, config, data: { code: 403, msg: 'denied', errorCode: 'DATASET_ACCESS_DENIED' }}
  }))
  const error = await request({ url: '/api/v1/tasks', method: 'post', data: {}}).catch(e => e)
  expect(error.errorCode).toBe('DATASET_ACCESS_DENIED')
  expect(error.status).toBe(403)
  expect(error.code).toBe(403)
  expect(error.message).toBe('denied')
})
