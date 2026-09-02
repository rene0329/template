import axios from 'axios'

const STORAGE_KEY = 'vdcs_runtime_config'
const DEFAULT_CONFIG = {
  backendUrl: process.env.VUE_APP_PRACTICE_API || 'http://10.212.14.88:31081',
  healthPath: '/actuator/health',
  timeout: 120000
}

function normalizeConfig(config = {}) {
  const backendUrl = String(config.backendUrl || DEFAULT_CONFIG.backendUrl)
    .trim()
    .replace(/\/+$/, '')

  if (!/^https?:\/\//i.test(backendUrl)) {
    throw new Error('后端地址必须以 http:// 或 https:// 开头')
  }

  let healthPath = String(config.healthPath || DEFAULT_CONFIG.healthPath).trim()
  if (healthPath === '/health' || healthPath === 'health') healthPath = DEFAULT_CONFIG.healthPath
  return {
    backendUrl,
    healthPath: healthPath.startsWith('/') ? healthPath : `/${healthPath}`,
    timeout: Number(config.timeout) > 0 ? Number(config.timeout) : DEFAULT_CONFIG.timeout
  }
}

function hasElectronConfigBridge() {
  return Boolean(window.appConfig && typeof window.appConfig.get === 'function')
}

export async function getRuntimeConfig() {
  if (hasElectronConfigBridge()) {
    return normalizeConfig(await window.appConfig.get())
  }

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return normalizeConfig({ ...DEFAULT_CONFIG, ...stored })
  } catch (error) {
    return normalizeConfig(DEFAULT_CONFIG)
  }
}

export async function saveRuntimeConfig(config) {
  const normalized = normalizeConfig(config)
  if (hasElectronConfigBridge()) {
    return normalizeConfig(await window.appConfig.set(normalized))
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export async function resetRuntimeConfig() {
  if (hasElectronConfigBridge()) {
    return normalizeConfig(await window.appConfig.reset())
  }
  localStorage.removeItem(STORAGE_KEY)
  return normalizeConfig(DEFAULT_CONFIG)
}

export async function testRuntimeConnection(config) {
  const normalized = normalizeConfig(config)
  if (hasElectronConfigBridge()) {
    return window.appConfig.test(normalized)
  }

  const url = `${normalized.backendUrl}${normalized.healthPath}`
  try {
    const response = await axios.get(url, { timeout: Math.min(normalized.timeout, 10000) })
    return { ok: response.status >= 200 && response.status < 300, status: response.status, url }
  } catch (error) {
    return {
      ok: false,
      message: error.response ? `健康检查返回 HTTP ${error.response.status}` : error.message,
      url
    }
  }
}
