import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Benchmarks only run on request: `npm run bench`.
  testIgnore: process.env['BENCH'] ? [] : /perf\.spec/,
  fullyParallel: !process.env['BENCH'],
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // Most flows add empty topics on purpose, so removing them is switched off unless a test asks.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:5173',
          localStorage: [
            { name: 'canopy.settings', value: JSON.stringify({ discardBlank: false }) },
          ],
        },
      ],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
