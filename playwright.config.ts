import { defineConfig, devices } from '@playwright/test';

const port = 18787;
const baseURL = `http://127.0.0.1:${port}`;
const desktop = { viewport: { width: 1440, height: 900 } };
const smoke = { dependencies: ['worker-smoke'] };
const journeys = { ...smoke, testIgnore: '**/responsive.spec.ts' };

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '*.spec.ts',
  workers: 4,
  use: { baseURL, reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    // An explicit empty env file keeps Wrangler from loading local credentials.
    command: `npm run build:preview && npm run dev:worker -- --ip 127.0.0.1 --port ${port} --inspector-port 0 --show-interactive-dev-session=false --env-file /dev/null --persist-to .wrangler/browser-tests --assets dist/browser-tests/client`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    env: {
      FRAME_FINISH_BROWSER_TEST: '1',
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
      CLOUDFLARE_INCLUDE_PROCESS_ENV: 'false',
      WRANGLER_LOG_PATH: '.wrangler/browser-test-logs',
    },
  },
  projects: [
    { name: 'worker-smoke', testMatch: '*.setup.ts' },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...desktop }, ...smoke },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], ...desktop }, ...journeys },
    { name: 'webkit', use: { ...devices['Desktop Safari'], ...desktop }, ...journeys },
    { name: 'android', use: devices['Pixel 7'], ...journeys },
    { name: 'iphone', use: devices['iPhone 13'], ...journeys },
  ],
});
