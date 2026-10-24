// Exposes a tiny, explicit API to the page; the page never gets Node.js access.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jrcDesktop', {
  platform: process.platform,
  saveBackup: (json) => ipcRenderer.invoke('backup:save', json),
  openBackup: () => ipcRenderer.invoke('backup:open'),
});
