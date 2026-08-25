const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('appConfig', {
  get: () => ipcRenderer.invoke('app-config:get'),
  set: config => ipcRenderer.invoke('app-config:set', config),
  reset: () => ipcRenderer.invoke('app-config:reset'),
  test: config => ipcRenderer.invoke('app-config:test', config)
})
