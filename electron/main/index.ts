import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { initDatabase } from './db'
import { registerDbHandlers } from './ipcHandlers'
import Store from 'electron-store'

// Persist app settings (theme, data path, etc.)
const store = new Store<{
  theme: string
  dataPath: string
  windowBounds: { width: number; height: number; x?: number; y?: number }
  sidebarCollapsed: boolean
  userRole: string
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

  // Save window size/position on close
  mainWindow.on('close', () => {
    if (mainWindow) {
      const b = mainWindow.getBounds()
      store.set('windowBounds', { width: b.width, height: b.height, x: b.x, y: b.y })
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load dev server or built files
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Initialize SQLite database
  initDatabase(store.get('dataPath'))

  // Register IPC handlers for DB operations
  registerDbHandlers(ipcMain, store)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
