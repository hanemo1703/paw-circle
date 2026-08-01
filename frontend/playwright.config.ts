import { defineConfig, devices } from '@playwright/test';

// Points at the isolated E2E frontend/backend instances, NOT the normal dev
// stack (localhost:3000/3001). See e2e/README.md for how to start them.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3010';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // The isolated stack is a single dev-mode Next.js + NestJS instance (see
  // e2e/README.md), not built to absorb unlimited concurrent load. Running
  // the full suite with Playwright's default (CPU-count) worker count causes
  // occasional, test-agnostic failures under contention — a slow first-time
  // page compile, a dropped connection to the backend, a client-side timer
  // callback (e.g. PostList's search debounce) getting starved of CPU time.
  // Capping workers locally too (not just in CI) reduces how often this
  // happens; retries handle the residual — this is a capacity limit of the
  // local dev-mode stack, not a bug in a specific test, so don't chase it by
  // endlessly raising individual assertion timeouts instead.
  workers: process.env.CI ? 2 : 4,
  retries: 1,
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
