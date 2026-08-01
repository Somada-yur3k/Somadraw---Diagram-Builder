import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// vite.config.js runs as an ES module (package.json's "type": "module"),
// which has no __dirname global the way CommonJS does - derived from
// import.meta.url instead, the standard replacement.
const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // monitor.html (src/monitor-main.jsx) is a second, standalone page -
      // its own bundle/entry, not part of the main app's React tree (see
      // MonitorPage.jsx's own comment). Without listing it here, `vite
      // build` only ever outputs index.html - dev mode serves any .html
      // file at the project root automatically, which is why this wasn't
      // needed to see it working locally, but a production build would
      // otherwise silently drop the page entirely.
      input: {
        main: resolve(__dirname, 'index.html'),
        monitor: resolve(__dirname, 'monitor.html'),
      },
    },
  },
})
