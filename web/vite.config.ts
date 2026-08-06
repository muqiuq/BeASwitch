import { defineConfig } from 'vite';
import pkg from './package.json';

export default defineConfig({
  // Relative so the build works from GitHub Pages, a school intranet or file://.
  base: './',
  define: {
    // package.json is the single source of truth for the footer version.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
