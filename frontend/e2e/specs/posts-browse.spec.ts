import { test, expect } from '../fixtures';
import { createPost } from '../helpers/api';
import { uniqueSuffix } from '../helpers/random';

// The E2E Postgres accumulates posts across runs (see e2e/README.md), so these
// tests never assert on the *total* number of posts in a list — only on
// posts matching a per-test unique title/suffix, searched for via the list
// page's search box, so historical data from other runs can't interfere.

test('search filters the list down to a single matching post', async ({ authedPage, user, request, apiURL }) => {
  const suffix = uniqueSuffix();
  const title = `E2E Search Match ${suffix}`;
  await createPost(request, apiURL, user.accessToken, { type: 'LOST', title });

  await authedPage.goto('/lost-found');
  await authedPage.getByPlaceholder('Tìm theo tên, khu vực...').fill(suffix);
  // Search input is debounced by 300ms before it's applied to the list.
  await expect(authedPage.getByText(title)).toBeVisible({ timeout: 5000 });
  await expect(authedPage.locator('[class*="postRow"]')).toHaveCount(1);
});

test('status filter chips control which posts are visible', async ({ authedPage, user, request, apiURL }) => {
  const suffix = uniqueSuffix();
  const openTitle = `E2E Status Open ${suffix}`;
  const resolvedTitle = `E2E Status Resolved ${suffix}`;

  await createPost(request, apiURL, user.accessToken, { type: 'LOST', title: openTitle });
  const resolvedPost = await createPost(request, apiURL, user.accessToken, {
    type: 'LOST',
    title: resolvedTitle,
  });
  const patchRes = await request.patch(`${apiURL}/posts/${resolvedPost.id}`, {
    data: { status: 'RESOLVED' },
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  expect(patchRes.ok()).toBe(true);

  await authedPage.goto('/lost-found');
  await authedPage.getByPlaceholder('Tìm theo tên, khu vực...').fill(suffix);

  // Default filter is "Đang tìm" (OPEN) only — the resolved post is hidden.
  await expect(authedPage.getByText(openTitle)).toBeVisible({ timeout: 5000 });
  await expect(authedPage.getByText(resolvedTitle)).toHaveCount(0);

  await authedPage.getByText('Đã tìm thấy', { exact: true }).click();

  await expect(authedPage.getByText(resolvedTitle)).toBeVisible();
});

test('pagination splits results matching the search into pages of 6', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const suffix = uniqueSuffix();
  for (let i = 1; i <= 7; i++) {
    await createPost(request, apiURL, user.accessToken, {
      type: 'SUPPLY',
      title: `E2E Page Item ${suffix}-${i}`,
    });
  }

  await authedPage.goto('/marketplace');

  // PostList.tsx paginates server-side (page/limit query params) with the search
  // box applied on a 300ms debounce. Its effects also have a brief, self-correcting
  // race: when `search` changes while `page` isn't already 1, the data-fetch effect
  // can fire once using the stale `page` value before the page-reset effect corrects
  // it and a second, correct fetch supersedes it a moment later (~200ms) — real users
  // only see a brief flicker, but a test clicking the pager during that window can
  // land on the wrong page. DOM-content-based readiness checks don't reliably guard
  // against this either: this test runs serially with nothing else seeding data in
  // between, so this run's posts are *always* the newest in the whole (100+ post)
  // table, meaning "visible rows belong to this run" is trivially true even on the
  // *unfiltered* page 1 — it doesn't prove filtering has actually settled. The only
  // unambiguous signal is the network response itself: wait for the backend to
  // confirm it filtered down to exactly our 7 posts before touching the pager.
  const filteredResponse = authedPage.waitForResponse(async (res) => {
    if (!res.url().includes('/api/posts') || !res.url().includes('search=') || !res.url().includes('page=1')) {
      return false;
    }
    try {
      return (await res.json()).total === 7;
    } catch {
      return false;
    }
  }, { timeout: 20_000 });
  await authedPage.getByPlaceholder('Tìm theo tên, khu vực...').fill(`E2E Page Item ${suffix}`);
  await filteredResponse;

  await expect(authedPage.locator('[class*="postRow"]')).toHaveCount(6);

  // exact: true — the logged-in user's name in the header button can itself
  // contain "2" as a substring, colliding with the page-number button.
  const page2Button = authedPage.getByRole('button', { name: '2', exact: true });
  await expect(page2Button).toBeVisible();

  await page2Button.click();
  await expect(authedPage.locator('[class*="postRow"]')).toHaveCount(1);
  await expect(authedPage.locator('[class*="postRow"] h3')).toHaveText(`E2E Page Item ${suffix}-1`);
});

test('switching to map view renders the map without console errors', async ({ authedPage, user, request, apiURL }) => {
  // PostsMapView shows a "no located posts" message instead of the map
  // itself when nothing in the filtered list has coordinates.
  await createPost(request, apiURL, user.accessToken, {
    type: 'TRADE',
    latitude: 21.028511,
    longitude: 105.804817,
  });

  const consoleErrors: string[] = [];
  authedPage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await authedPage.goto('/trade');
  await authedPage.getByRole('button', { name: 'Bản đồ' }).click();

  await expect(authedPage.locator('.leaflet-container')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
