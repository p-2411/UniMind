import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  // Vite is being configured to build a browser extension
  // rather than a standard web application
  base: './',

  // This tells Vite to build for a browser environment that will load
  // the code directly from the file system, not from a web server
  build: {
    outDir: 'dist',

    // We're creating a multi-page application with one entry point
    // for the block page. This keeps the background script separate.
    rollupOptions: {
      input: {
        'index': resolve(__dirname, 'index.html')
      },
      output: {
        // Extensions need predictable file names, not hashed ones,
        // so we can reference them in the manifest
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },

    // Source maps help with debugging but aren't necessary for production
    sourcemap: false,
  },

  // This prevents Vite from trying to open a browser during development
  server: {
    open: false
  }
})
