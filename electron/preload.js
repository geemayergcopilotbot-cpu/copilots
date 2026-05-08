const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  readFiles: (paths) => ipcRenderer.invoke('read-files', paths),
  storeToken: (token) => ipcRenderer.invoke('store-token', token),
  getToken: () => ipcRenderer.invoke('get-token'),
  commitFiles: (payload) => ipcRenderer.invoke('commit-files', payload),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
})
