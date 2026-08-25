const { app, BrowserWindow, ipcMain, net, shell } = require('electron')
const fs = require('fs')
const path = require('path')

const APP_NAME = '虚拟数据中心原位调度子系统'
const CONFIG_FILE = 'config.json'

function normalizeBackendUrl(value) {
  const url = new URL(String(value || '').trim())
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('后端地址只支持 http:// 或 https://')
  }
  url.pathname = url.pathname.replace(/\/+$/, '')
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

function normalizeHealthPath(value) {
  const result = String(value || '/health').trim()
  return result.startsWith('/') ? result : `/${result}`
}

function normalizeConfig(config = {}) {
  return {
    backendUrl: normalizeBackendUrl(config.backendUrl),
    healthPath: normalizeHealthPath(config.healthPath),
    timeout: Number(config.timeout) > 0 ? Number(config.timeout) : 120000
  }
}

function getDefaultConfig() {
  const bundledConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'default-config.json'), 'utf8')
  )
  const environmentUrl = process.env.VDCS_BACKEND_URL
  return normalizeConfig({
    ...bundledConfig,
    ...(environmentUrl ? { backendUrl: environmentUrl } : {})
  })
}

function getUserConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILE)
}

function getCommandLineBackendUrl() {
  const argument = process.argv.find(item => item.startsWith('--backend-url='))
  return argument ? argument.slice('--backend-url='.length) : ''
}

function readConfig() {
  let config = getDefaultConfig()
  try {
    const userConfig = JSON.parse(fs.readFileSync(getUserConfigPath(), 'utf8'))
    config = normalizeConfig({ ...config, ...userConfig })
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('读取用户配置失败，将使用默认配置:', error.message)
    }
  }

  const commandLineUrl = getCommandLineBackendUrl()
  return commandLineUrl
    ? normalizeConfig({ ...config, backendUrl: commandLineUrl })
    : config
}

function writeConfig(config) {
  const normalized = normalizeConfig({ ...getDefaultConfig(), ...config })
  fs.mkdirSync(path.dirname(getUserConfigPath()), { recursive: true })
  fs.writeFileSync(getUserConfigPath(), `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  return normalized
}

async function testConnection(config) {
  const normalized = normalizeConfig({ ...getDefaultConfig(), ...config })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.min(normalized.timeout, 10000))
  const target = new URL(normalized.healthPath, `${normalized.backendUrl}/`).toString()

  try {
    const response = await net.fetch(target, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    })
    if (!response.ok) {
      throw new Error(`健康检查返回 HTTP ${response.status}`)
    }
    return { ok: true, status: response.status, url: target }
  } catch (error) {
    const message = error.name === 'AbortError' ? '连接超时' : error.message
    return { ok: false, message, url: target }
  } finally {
    clearTimeout(timeout)
  }
}

function registerConfigHandlers() {
  ipcMain.handle('app-config:get', () => readConfig())
  ipcMain.handle('app-config:set', (_, config) => writeConfig(config))
  ipcMain.handle('app-config:reset', () => {
    try {
      fs.unlinkSync(getUserConfigPath())
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    return getDefaultConfig()
  })
  ipcMain.handle('app-config:test', (_, config) => testConnection(config))
}

function createWindow() {
  const window = new BrowserWindow({
    title: APP_NAME,
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5f7fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', event => event.preventDefault())
  window.once('ready-to-show', () => window.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0]
    if (window) {
      if (window.isMinimized()) window.restore()
      window.focus()
    }
  })

  app.whenReady().then(() => {
    app.setName(APP_NAME)
    registerConfigHandlers()
    createWindow()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
