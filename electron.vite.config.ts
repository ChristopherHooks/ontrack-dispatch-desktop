import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { builtinModules } from 'module'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

// ESM-safe __dirname (works in both CJS and ESM module contexts)
const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

// Everything that must remain external in the main/preload Node processes.
// electron-vite v5 + rolldown requires explicit listing — externalizeDepsPlugin
// is deprecated and doesn't handle devDependencies (including 'electron' itself).
const nodeExternal = [
  'electron',
  'better-sqlite3',
  'electron-store',
  ...builtinModules,
  // Also support 'node:fs' style imports
  ...builtinModules.map((m) => `node:${m}`),
]

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(_dirname, 'electron/main/index.ts'),
        external: nodeExternal,
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(_dirname, 'electron/preload/index.ts'),
        external: nodeExternal,
      },
    },
  },
  renderer: {
    root: resolve(_dirname, 'src'),
    build: {
      rollupOptions: {
        input: resolve(_dirname, 'src/index.html'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(_dirname, 'src'),
      },
    },
    plugins: [react()],
  },
})
