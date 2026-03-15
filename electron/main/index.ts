import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { initDatabase, getDataDir, getDb } from './db'
import { registerDbHandlers } from './ipcHandlers'
import { startScheduler, stopScheduler } from './scheduler'
import { applyPendingRestore, stopPeriodicBackup } from './backup'
import Store from 'electron-store'

const store = new Store<{
  // Machine-local (never synced to cloud)
  theme: string
  dataPath: string
  windowBounds: { width: number; height: number; x?: number; y?: number }
  sidebarCollapsed: boolean
  userRole: string
  pendingRestore?: string
  // Business identity (persisted here so syncAdminUserFromStore can read them)
  companyName?: string
  ownerName?: string
  ownerEmail?: string
  defaultDispatchPct?: number
}>({
  defaults: {
    theme: 'dark',
    dataPath: '',
    windowBounds: { width: 1280, height: 800 },
    sidebarCollapsed: false,
    userRole: 'admin',
  },
})

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const bounds = store.get('windowBounds')

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#141416',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('close', () => {
    if (mainWindow) {
      const b = mainWindow.getBounds()
      store.set('windowBounds', { width: b.width, height: b.height, x: b.x, y: b.y })
    }
  })

  mainWindow.on('ready-to-show', () => { mainWindow?.show() })

  // F12 toggles DevTools (always available — useful in both dev and prod for support)
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const customDataPath = store.get('dataPath') as string
  const resolvedDataDir = (customDataPath && customDataPath !== '')
    ? customDataPath
    : require('path').join(app.getPath('userData'), 'OnTrackDashboard')
  const dbPath = require('path').join(resolvedDataDir, 'database.db')

  // Apply staged restore BEFORE opening the database
  const restored = applyPendingRestore(dbPath, store as any)
  if (restored) console.log('[Main] Database restored from backup')

  initDatabase(customDataPath, store as any)  // also starts periodic backup; syncs admin user from store
  registerDbHandlers(ipcMain, store)
  startScheduler(
    () => { const { getDb } = require('./db'); return getDb() },
    (key) => store.get(key as any),
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopScheduler()
  stopPeriodicBackup()
  if (process.platform !== 'darwin') app.quit()
})
