const FALLBACK_BACKEND_URL = 'http://10.15.16.40:30482'
const BACKEND_PORT = '30482'

function browserLocation() {
  return typeof window === 'undefined' ? null : window.location
}

function urlHostname(hostname) {
  if (!hostname || hostname[0] === '[' || hostname.indexOf(':') === -1) return hostname
  return `[${hostname}]`
}

export function resolveDefaultBackendUrl({
  configuredUrl = process.env.VUE_APP_PRACTICE_API,
  location = browserLocation()
} = {}) {
  const configured = String(configuredUrl || '').trim().replace(/\/+$/, '')
  if (configured) return configured

  if (location && /^https?:$/.test(location.protocol) && location.hostname) {
    return `${location.protocol}//${urlHostname(location.hostname)}:${BACKEND_PORT}`
  }

  return FALLBACK_BACKEND_URL
}

export { BACKEND_PORT, FALLBACK_BACKEND_URL }
