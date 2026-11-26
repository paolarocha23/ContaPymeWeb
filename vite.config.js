import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'ContaPyme',
      short_name: 'ContaPyme',
      description: 'Sistema de gestión y control empresarial',
      lang: 'es',
      theme_color: '#ffffff',
    },

    workbox: {
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      // La interfaz ya se precarga. Estas fuentes externas se guardan en caché
      // para que el diseño no cambie cuando no hay conexión.
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\//i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'contapyme-fonts-css',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] }
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\//i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'contapyme-fonts',
            expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] }
          }
        }
      ],
    },

    devOptions: {
      enabled: true,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
