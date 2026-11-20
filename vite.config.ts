import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    // Schriften (woff2, je etwa 17 KB) direkt einbetten, damit die Einzeldatei sie mitbringt
    assetsInlineLimit: 40_000,
    chunkSizeWarningLimit: 1500,
    // Ein einziges JS-Bundle, damit sich das Spiel als eine einzelne HTML-Datei ausliefern lässt.
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 20_000 },
});
