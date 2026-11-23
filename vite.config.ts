import { defineConfig } from 'vite';

export default defineConfig({
  // Relative URLs work locally and on GitHub Pages project sites (/farm-game/).
  base: './',
  server: { host: '0.0.0.0', port: 5173 },
  preview: { host: '0.0.0.0', port: 4173 },
});
