import { defineConfig, devices } from '@playwright/test';

// Makes the README screenshots (`npm run screenshots`). It is not part of the test suite.
export default defineConfig({
  testDir: './scripts/screenshots',
  testMatch: /screenshots\.spec\.ts/,
  // One picture at a time, so the dev server and the animations are never busy with two.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    // The pictures show the app as a new visitor sees it.
    storageState: { cookies: [], origins: [] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
