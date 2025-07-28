import { defineConfig, devices } from '@playwright/test';

// Points at the isolated E2E frontend/backend instances, NOT the normal dev
// stack (localhost:3000/3001). See e2e/README.md for how to start them.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3010';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Not used by default — this suite assumes the isolated E2E stack (see
  // e2e/README.md) is already running, matching how this project's dev
  // stack is normally started manually. Left here as scaffolding for a
  // future CI setup that wants Playwright to start everything itself.
  //
  // webServer: [
  //   {
  //     command: 'yarn start:dev',
  //     cwd: '../backend',
  //     url: 'http://localhost:3002/api/health',
  //     reuseExistingServer: true,
  //     env: { DB_PORT: '5438', PORT: '3002' },
  //   },
  //   {
  //     command: 'yarn dev',
  //     url: 'http://localhost:3010',
  //     reuseExistingServer: true,
  //     env: { NEXT_PUBLIC_API_URL: 'http://localhost:3002/api', PORT: '3010' },
  //   },
  // ],
});
