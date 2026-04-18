const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to communicate with
// the main process via IPC
contextBridge.exposeInMainWorld('electronAPI', {
  // App management
  getApps: () => ipcRenderer.invoke('get-apps'),
  launchApp: (appId) => ipcRenderer.invoke('launch-app', appId),
  terminateApp: (appId) => ipcRenderer.invoke('terminate-app', appId),
  
  // Python process management
  startDownload: (appId, url, quality) => ipcRenderer.invoke('start-download', appId, url, quality),
  cancelDownload: (appId) => ipcRenderer.invoke('cancel-download', appId),
  startPythonApp: (appId, args) => ipcRenderer.invoke('start-python-app', appId, args),
  stopPythonApp: (appId) => ipcRenderer.invoke('stop-python-app', appId),
  sendInput: (appId, input) => ipcRenderer.invoke('send-input', appId, input),
  
  // Window control
  closeApp: () => ipcRenderer.invoke('close-app'),
  minimizeApp: () => ipcRenderer.invoke('minimize-app'),
  maximizeApp: () => ipcRenderer.invoke('maximize-app'),
  
  // System metrics
  getSystemMetrics: () => ipcRenderer.invoke('get-system-metrics'),
  
  // Event subscriptions
  onAppStatusUpdate: (callback) => 
    ipcRenderer.on('app-status-update', (_, data) => callback(data)),
  onAppLaunched: (callback) => 
    ipcRenderer.on('app-launched', (_, data) => callback(data)),
  onAppLaunchError: (callback) => 
    ipcRenderer.on('app-launch-error', (_, data) => callback(data)),
  onAppClosed: (callback) => 
    ipcRenderer.on('app-closed', (_, data) => callback(data)),
  onAllAppsInitialized: (callback) =>
    ipcRenderer.on('all-apps-initialized', () => callback()),
  onDownloadProgress: (callback) =>
    ipcRenderer.on('download-progress', (_, data) => callback(data)),
  onDownloadComplete: (callback) =>
    ipcRenderer.on('download-complete', (_, data) => callback(data)),
  onDownloadError: (callback) =>
    ipcRenderer.on('download-error', (_, data) => callback(data)),
  onDownloadInfo: (callback) =>
    ipcRenderer.on('download-info', (_, data) => callback(data)),
  onPythonOutput: (callback) =>
    ipcRenderer.on('python-output', (_, data) => callback(data)),
  onPythonFrame: (callback) =>
    ipcRenderer.on('python-frame', (_, data) => callback(data)),
    
  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Health report file access
  listHealthReports: () => ipcRenderer.invoke('list-health-reports'),
  readHealthReport: (filePath) => ipcRenderer.invoke('read-health-report', filePath)
});