import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 7100,
    strictPort: false,
    // السماح بالدخول من أجهزة أخرى على نفس الشبكة (موبايل / كمبيوتر)
    host: true,
    // السماح بالوصول عبر نفق الإنترنت (Cloudflare Tunnel)
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:7102', changeOrigin: true },
      '/ws': { target: 'ws://localhost:7102', ws: true },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
