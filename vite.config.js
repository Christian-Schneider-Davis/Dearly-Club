import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'

// VITE_BASE controls the URL prefix the site is served from.
// - GitHub Pages project URL (christian-schneider-davis.github.io/Dearly-Club/): '/Dearly-Club/'
// - Custom domain (dearlyclub.eu) or local dev: '/'
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  // The admin chunk carries Firestore (~175 kB gzipped); it only loads on /admin.
  build: { chunkSizeWarningLimit: 700 },
  plugins: [react(), imagetools()],
})
