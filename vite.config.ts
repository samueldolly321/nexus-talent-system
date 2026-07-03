import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import express from 'express';
import {defineConfig, type PluginOption} from 'vite';

// Dessert le dossier /uploads (photos candidats uploadées) en statique pendant
// le dev. Le serveur Express monte les middlewares Vite, donc ce middleware
// intercepte /uploads/* avant le fallback SPA.
function serveUploads(): PluginOption {
  return {
    name: 'serve-uploads',
    configureServer(server) {
      server.middlewares.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), serveUploads()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
