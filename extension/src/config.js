// Central place to configure the API base URL for the extension.
// Reads Vite env (VITE_API_URL) if provided at build time; otherwise falls back to localhost.
// Example build: VITE_API_URL=https://your-api.onrailway.app npm run build

export const API_BASE_URL = (import.meta.env?.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
  : 'http://localhost:8000');

// Frontend/dashboard URL for the extension
export const FRONTEND_URL = (import.meta.env?.VITE_FRONTEND_URL
  ? String(import.meta.env.VITE_FRONTEND_URL).replace(/\/$/, '')
  : 'http://localhost:5173');

