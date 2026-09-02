import request from '@/api/axiosConfig'
import { unregisterDataset } from '@/api/registrationApi'

jest.mock('@/api/axiosConfig', () => jest.fn())

it('deletes the logical dataset through the v1 endpoint with an idempotency key', () => {
  unregisterDataset(42)
  expect(request).toHaveBeenCalledWith({
    url: '/api/v1/datasets/42', method: 'delete', data: undefined,
    headers: { 'Idempotency-Key': expect.any(String) }
  })
  expect(request.mock.calls[0][0].headers['Idempotency-Key'].length).toBeGreaterThanOrEqual(8)
})
