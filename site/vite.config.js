import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Multi-page build: four HTML entry points, one per site page, matching the
// design handoff's four screens. Output goes to ../public (repo root) --
// that directory is gitignored and rebuilt by CI (see
// .github/workflows/pages.yml) rather than committed.
export default defineConfig({
  // Deployed as a GitHub Pages PROJECT site (mbilokonsky.github.io/groovy-commutator/),
  // not a user/root site -- every asset URL Vite emits needs this prefix or
  // it resolves against the domain root instead and 404s (blank page, since
  // the JS bundle never loads). Internal nav links/image src in the
  // components are deliberately relative instead, so they're unaffected by
  // this and would work under any base path.
  base: '/groovy-commutator/',
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../public'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        concepts: resolve(__dirname, 'concepts.html'),
        questions: resolve(__dirname, 'questions.html'),
        explorer: resolve(__dirname, 'explorer.html'),
      },
    },
  },
});
