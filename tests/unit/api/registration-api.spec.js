import request from '@/api/axiosConfig'
import { unregisterDataset, fetchRegisteredTaskJobs, cancelRegisteredTask } from '@/api/registrationApi'

jest.mock('@/api/axiosConfig', () => jest.fn())

it('deletes the logical dataset through the v1 endpoint with an idempotency key', () => {
  unregisterDataset(42)
  expect(request).toHaveBeenCalledWith({
    url: '/api/v1/datasets/42', method: 'delete', data: undefined,
    headers: { 'Idempotency-Key': expect.any(String) }
  })
  expect(request.mock.calls[0][0].headers['Idempotency-Key'].length).toBeGreaterThanOrEqual(8)
})

it('queries durable jobs and requests task cancellation through the v1 endpoints', () => {
  request.mockClear()
  fetchRegisteredTaskJobs(42, { silent: true })
  cancelRegisteredTask(42)
  expect(request.mock.calls).toEqual([
    [{ url: '/api/v1/tasks/42/jobs', method: 'get', silent: true }],
    [{ url: '/api/v1/tasks/42/cancel', method: 'post' }]
  ])
})
