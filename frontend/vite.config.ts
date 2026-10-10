import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Vite configuration for the Urban Hound PWA.
 *
 * The `base` path matches the GitHub repository name so the app can be served
 * from GitHub Pages at `/<repo>/`. Hash routing is used at runtime, so the
 * static host never needs SPA fallback rules.
 */
export default defineConfig({
  base: '/urbanhound/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Urban Hound',
        short_name: 'Urban Hound',
        description:
          'Field walk tracking, a retro photo kit, and a refined daily vibe for city hounds.',
        theme_color: '#2b2620',
        background_color: '#f4ecdd',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/urbanhound/index.html',
      },
    }),
  ],
})
