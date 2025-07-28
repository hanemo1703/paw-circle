import { test as base, expect, APIRequestContext, Page } from '@playwright/test';
import { randomTestEmail, randomTestName } from './helpers/random';

// Isolated E2E backend, not the normal dev backend on :3001 — see e2e/README.md.
const API_URL = process.env.E2E_API_URL || 'http://localhost:3002/api';
const TEST_PASSWORD = 'Test1234!';

// Mirrors AuthUser in frontend/src/lib/auth.tsx — kept as a plain type here
// rather than importing that module, since it's a browser/React module and
// this file runs in Playwright's Node process.
interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  showPhonePublicly?: boolean;
  showEmailPublicly?: boolean;
}

export interface TestUser {
  email: string;
  password: string;
  name: string;
  accessToken: string;
  authUser: AuthUser;
}

async function registerAndLogin(request: APIRequestContext): Promise<TestUser> {
  const email = randomTestEmail();
  const password = TEST_PASSWORD;
  const name = randomTestName();

  const registerRes = await request.post(`${API_URL}/auth/register`, {
    data: { email, password, name },
  });
  if (!registerRes.ok()) {
    throw new Error(`Failed to register E2E test user: ${registerRes.status()} ${await registerRes.text()}`);
  }

  const loginRes = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  if (!loginRes.ok()) {
    throw new Error(`Failed to log in E2E test user: ${loginRes.status()} ${await loginRes.text()}`);
  }
  const body = await loginRes.json();

  return { email, password, name, accessToken: body.accessToken, authUser: body.user };
}

type Fixtures = {
  apiURL: string;
  user: TestUser;
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  apiURL: async ({}, use) => {
    await use(API_URL);
  },

  user: async ({ request }, use) => {
    const user = await registerAndLogin(request);
    await use(user);
  },

  // A page with a logged-in session already seeded into localStorage before
  // any navigation happens. This must run via addInitScript (not a plain
  // page.evaluate after goto) so the value is present before React hydrates
  // and AuthProvider's mount-time useEffect reads localStorage — otherwise
  // isAuthenticated is briefly false and protected pages redirect to /login.
  authedPage: async ({ page, user }, use) => {
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      ['petconnect_auth', JSON.stringify({ user: user.authUser, accessToken: user.accessToken })] as [
        string,
        string,
      ],
    );
    await use(page);
  },
});

export { expect };
