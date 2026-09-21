import { defineConfig } from 'vite'
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/scripts/youtube.ts"),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
        codeSplitting: true,
      }
    }
  }
});