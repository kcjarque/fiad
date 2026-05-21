import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: true,
    host: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
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
