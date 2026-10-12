import {
  FALLBACK_BACKEND_URL,
  resolveDefaultBackendUrl
} from '@/utils/backend-url'

it('uses the current Web host with the backend NodePort', () => {
  expect(resolveDefaultBackendUrl({
    configuredUrl: '',
    location: { protocol: 'http:', hostname: '47.100.132.169' }
  })).toBe('http://47.100.132.169:30482')

  expect(resolveDefaultBackendUrl({
    configuredUrl: '',
    location: { protocol: 'https:', hostname: 'topic4.example.com' }
  })).toBe('https://topic4.example.com:30482')
})

it('keeps an explicit build-time backend address', () => {
  expect(resolveDefaultBackendUrl({
    configuredUrl: ' http://backend.example.com:8080/ ',
    location: { protocol: 'http:', hostname: 'frontend.example.com' }
  })).toBe('http://backend.example.com:8080')
})

it('formats IPv6 hostnames for use in a URL', () => {
  expect(resolveDefaultBackendUrl({
    configuredUrl: '',
    location: { protocol: 'http:', hostname: '2001:db8::1' }
  })).toBe('http://[2001:db8::1]:30482')
})

it('uses the cluster fallback when there is no HTTP page host', () => {
  expect(resolveDefaultBackendUrl({
    configuredUrl: '',
    location: { protocol: 'file:', hostname: '' }
  })).toBe(FALLBACK_BACKEND_URL)
})
