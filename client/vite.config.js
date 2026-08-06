import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // Raise the warning threshold a little — we're intentionally code-splitting
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — smallest possible chunk that must be cached forever
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-is/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }

          // Router — changes rarely, keep separate for long-term caching
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run/')) {
            return 'vendor-router';
          }

          // Charts — recharts + d3 deps are large, isolate them
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-') ||
              id.includes('node_modules/react-smooth')) {
            return 'vendor-charts';
          }

          // Icon library — large icon set, split out so pages don't re-download it
          if (id.includes('node_modules/react-icons')) {
            return 'vendor-icons';
          }

          // HTTP client
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }

          // pdfjs-dist is lazy-loaded at runtime — Rollup still creates a chunk
          // for it; keeping it explicit avoids it merging into app code
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdfjs';
          }

          // tesseract.js — also used on-demand only
          if (id.includes('node_modules/tesseract.js')) {
            return 'vendor-tesseract';
          }

          // Everything else in node_modules goes to a generic vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
})
