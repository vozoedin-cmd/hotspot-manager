import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['wifi.svg', 'pwa-192.svg'],
      manifest: {
        name: 'HotspotManager',
        short_name: 'Hotspot',
        description: 'Gestión de fichas Hotspot MikroTik',
        theme_color: '#1e40af',
        background_color: '#f0f4ff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/wifi.svg', sizes: '32x32', type: 'image/svg+xml' },
        ],
        categories: ['business', 'utilities'],
        shortcuts: [
          {
            name: 'Vender Ficha',
            short_name: 'Vender',
            description: 'Vender una ficha rápidamente',
            url: '/seller/sell',
            icons: [{ src: '/pwa-192.svg', sizes: '192x192' }],
          },
          {
            name: 'Dashboard Admin',
            short_name: 'Admin',
            description: 'Panel de administración',
            url: '/admin',
            icons: [{ src: '/pwa-192.svg', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Cache para las peticiones de la API
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\.(js|css|png|svg|woff2?)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});

