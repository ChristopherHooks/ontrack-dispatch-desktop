import { app, BrowserWindow, ipcMain, shell, session, dialog, screen } from 'electron'
import { join } from 'path'
import { initDatabase, getDataDir, getDb } from './db'
import { registerDbHandlers } from './ipcHandlers'
import { startScheduler, stopScheduler } from './scheduler'
import { startWebServer, stopWebServer } from './webServer'
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
  ownerPhone?: string
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

// Single-instance lock — second launch focuses the existing window instead of opening another.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

let mainWindow: BrowserWindow | null = null

// Clamp saved window bounds to a visible display area.
// Guards against the window reopening off-screen after a monitor is disconnected.
function clampBounds(
  saved: { width: number; height: number; x?: number; y?: number }
): { width: number; height: number; x?: number; y?: number } {
  if (saved.x === undefined || saved.y === undefined) return saved
  const onScreen = screen.getAllDisplays().some(d =>
    saved.x! < d.bounds.x + d.bounds.width  &&
    saved.x! + saved.width  > d.bounds.x     &&
    saved.y! < d.bounds.y + d.bounds.height  &&
    saved.y! + saved.height > d.bounds.y
  )
  if (onScreen) return saved
  const wa = screen.getPrimaryDisplay().workArea
  return { width: saved.width, height: saved.height, x: wa.x + 40, y: wa.y + 40 }
}

function createWindow(): void {
  const bounds = clampBounds(store.get('windowBounds'))

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
      preload: join(__dirname, '../preload/index.js'),
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
    // Close all pop-out windows when the main window closes
    BrowserWindow.getAllWindows().forEach(w => {
      if (w !== mainWindow) w.destroy()
    })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
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
  // Content-Security-Policy — only enforced in packaged builds.
  // Dev mode uses Vite HMR (inline scripts + WebSocket) which strict CSP would block.
  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self'; " +
            "object-src 'none'",
          ],
        },
      })
    })
  }
  const customDataPath = store.get('dataPath') as string
  const resolvedDataDir = (customDataPath && customDataPath !== '')
    ? customDataPath
    : require('path').join(app.getPath('userData'), 'OnTrackDashboard')
  const dbPath = require('path').join(resolvedDataDir, 'database.db')

  // Apply staged restore BEFORE opening the database
  const restored = applyPendingRestore(dbPath, store as any)
  if (restored) console.log('[Main] Database restored from backup')

  try {
    initDatabase(customDataPath, store as any)  // also starts periodic backup; syncs admin user from store
  } catch (err) {
    dialog.showErrorBox(
      'OnTrack failed to start',
      'The database could not be opened.\n\n' + String(err) +
      '\n\nData path: ' + resolvedDataDir
    )
    app.quit()
    return
  }

  registerDbHandlers(ipcMain, store)

  // Pop-out document viewer — opens a minimal borderless window for a single doc
  ipcMain.handle('documents:popout', (_e, id: number) => {
    const win = new BrowserWindow({
      width: 700,
      height: 860,
      minWidth: 500,
      minHeight: 400,
      autoHideMenuBar: true,
      backgroundColor: '#141416',
      title: 'OnTrack — Document',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
    if (process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/popout/' + id)
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/popout/' + id })
    }
  })

  startScheduler(
    () => { const { getDb } = require('./db'); return getDb() },
    (key) => store.get(key as any),
  )

  startWebServer(
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
  stopWebServer()
  stopPeriodicBackup()
  if (process.platform !== 'darwin') app.quit()
})
