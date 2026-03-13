import { contextBridge, ipcRenderer } from 'electron'

// Expose a type-safe API to the renderer process.
// Add new channel names here as features are built.
contextBridge.exposeInMainWorld('api', {
  // Settings
  settings: {
    get:    (key: string) => ipcRenderer.invoke('settings:get', key),
    set:    (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },

  // Dashboard
  dashboard: {
    stats: () => ipcRenderer.invoke('dashboard:stats'),
  },

  // Generic DB query (read-only, for development)
  db: {
    query: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:query', sql, params),
  },
})
