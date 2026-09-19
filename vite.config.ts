import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: true,
    host: true,
    // Allow Cloudflare quick tunnels. Testing the QR scanner needs a real
    // camera on a real phone, and getUserMedia only runs in a secure context —
    // so a phone on the LAN over plain http can't open the camera at all. A
    // tunnel gives dev an https origin; without this Vite answers 403 to the
    // tunnel's Host header. Dev-server only: it has no bearing on the build.
    allowedHosts: ['.trycloudflare.com'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // Activate new SW immediately so guests don't stay stuck on an old
        // bundle for hours after a deploy on event day.
        skipWaiting: true,
        clientsClaim: true,
        // HTML / navigation requests must be network-first. If wifi is
        // reachable we fetch fresh; otherwise we fall back to cache so the
        // app still loads offline. Hashed asset URLs change per build, so
        // they keep their default cache-first behavior.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fiad-html',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      manifest: {
        name: 'Forever in a Day',
        short_name: 'FIAD',
        description: 'Event bazaar CRM — raffles, passports, and walkthroughs.',
        theme_color: '#3E2A3E',
        background_color: '#FAF6F0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-512.svg', sizes: '192x192 512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});
