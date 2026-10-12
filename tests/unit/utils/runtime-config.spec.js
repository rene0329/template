import {
  getRuntimeConfig,
  resetRuntimeConfig,
  saveRuntimeConfig
} from '@/utils/runtime-config'

beforeEach(() => {
  window.localStorage.clear()
  delete window.appConfig
})

it('derives the Web default backend from the current page host', async() => {
  const config = await getRuntimeConfig()
  expect(config.backendUrl).toBe('http://localhost:30482')
})

it('keeps a backend address saved by the user', async() => {
  await saveRuntimeConfig({
    backendUrl: 'http://manual.example.com:8080/',
    healthPath: '/actuator/health',
    timeout: 5000
  })

  const config = await getRuntimeConfig()
  expect(config.backendUrl).toBe('http://manual.example.com:8080')
})

it('returns to the host-derived backend after reset', async() => {
  await saveRuntimeConfig({ backendUrl: 'http://manual.example.com:8080' })
  const config = await resetRuntimeConfig()
  expect(config.backendUrl).toBe('http://localhost:30482')
})
