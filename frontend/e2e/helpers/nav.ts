import { Page } from '@playwright/test';

// Several protected pages (messages inbox/thread, profile view/edit/posts) redirect
// straight to /login on a fresh hard page load even for an already-authenticated
// session, because their auth-guard `useEffect` runs (and calls router.replace)
// before AuthProvider's own mount effect has read the session out of localStorage
// and resolved `isAuthenticated` — confirmed via 5/5 reproductions of a plain
// `authedPage.goto('/messages')` (see e2e/README.md and the E2E test report for
// details; this is a real app bug, not a test artifact). Pages that defer the
// check by a render tick via a `checkingAuth` flag (e.g. posts/new, donations/new)
// don't have this problem. Landing on an unguarded page first and reaching the
// affected page via a real in-app link click (client-side routing, no reload)
// sidesteps it — and also matches how a real user actually gets there.

export async function gotoMessagesViaHeader(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Nhắn tin' }).click();
}

export async function gotoViaUserMenu(page: Page, userName: string, itemLabel: string) {
  await page.goto('/');
  await page.getByRole('button', { name: userName }).click();
  await page.getByRole('link', { name: itemLabel }).click();
}
