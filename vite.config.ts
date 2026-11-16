import { fileURLToPath } from 'node:url';
import { defineConfig, normalizePath } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

const siteConfigPath = normalizePath(fileURLToPath(new URL('./src/content/site.json', import.meta.url)));

export default defineConfig(({ command, isPreview, isSsrBuild, mode }) => {
  const browserTest = command === 'build' && mode === 'local-preview' && process.env.FRAME_FINISH_BROWSER_TEST === '1';
  const buildRoot = browserTest ? 'dist/browser-tests' : 'dist';
  return {
    plugins: [solid({ ssr: true }), tailwindcss(), browserTest && {
      name: 'browser-test-turnstile',
      enforce: 'pre',
      transform(source, id) {
        if (id !== siteConfigPath) return;
        return JSON.stringify({ ...JSON.parse(source), turnstileSiteKey: 'synthetic-browser-key' });
      },
    }],
    resolve: {
      alias: command === 'serve' && !isPreview ? [{
        find: /^@fortawesome\/free-solid-svg-icons$/,
        replacement: fileURLToPath(new URL('./src/components/solid-icons.dev.ts', import.meta.url)),
      }] : [],
    },
    build: { outDir: `${buildRoot}/${isSsrBuild ? 'server' : 'client'}`, target: 'es2022', manifest: !isSsrBuild },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: false,
        },
      },
    },
  };
});
