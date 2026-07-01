import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Multi-page build: four HTML entry points, one per site page, matching the
// design handoff's four screens. Output goes to ../public (repo root) --
// that directory is gitignored and rebuilt by CI (see
// .github/workflows/pages.yml) rather than committed.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../public'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        concepts: resolve(__dirname, 'concepts.html'),
        findings: resolve(__dirname, 'findings.html'),
        explorer: resolve(__dirname, 'explorer.html'),
      },
    },
  },
});
