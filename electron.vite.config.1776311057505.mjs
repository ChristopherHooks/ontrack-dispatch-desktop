// electron.vite.config.ts
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import { builtinModules } from "module";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
var __electron_vite_injected_dirname = "/sessions/exciting-determined-archimedes/mnt/app";
var __electron_vite_injected_import_meta_url = "file:///sessions/exciting-determined-archimedes/mnt/app/electron.vite.config.ts";
var _dirname = typeof __electron_vite_injected_dirname !== "undefined" ? __electron_vite_injected_dirname : dirname(fileURLToPath(__electron_vite_injected_import_meta_url));
var nodeExternal = [
  "electron",
  "better-sqlite3",
  "electron-store",
  ...builtinModules,
  // Also support 'node:fs' style imports
  ...builtinModules.map((m) => `node:${m}`)
];
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(_dirname, "electron/main/index.ts"),
        external: nodeExternal
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(_dirname, "electron/preload/index.ts"),
        external: nodeExternal
      }
    }
  },
  renderer: {
    root: resolve(_dirname, "src"),
    build: {
      rollupOptions: {
        input: resolve(_dirname, "src/index.html")
      }
    },
    resolve: {
      alias: {
        "@": resolve(_dirname, "src")
      }
    },
    plugins: [react()]
  }
});
export {
  electron_vite_config_default as default
};
