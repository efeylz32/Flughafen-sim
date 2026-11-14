import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 800,
    // Ein einziges JS-Bundle, damit sich das Spiel als eine einzelne HTML-Datei ausliefern lässt.
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
