import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: '.',
  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        trip: resolve(__dirname, 'trip.html'),
        login: resolve(__dirname, 'login.html'),
        profile: resolve(__dirname, 'profile.html'),
        'pending-bookings': resolve(__dirname, 'pending-bookings.html'),
        changelog: resolve(__dirname, 'changelog.html'),
        share: resolve(__dirname, 'share.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('/js/utils.js') ||
              id.includes('/js/i18n.js') ||
              id.includes('/js/auth.js') ||
              id.includes('/js/navigation.js')) {
            return 'shared';
          }
        },
      },
    },
  },

  server: {
    proxy: {
      '/.netlify/functions': 'http://localhost:8888',
    },
  },
});
