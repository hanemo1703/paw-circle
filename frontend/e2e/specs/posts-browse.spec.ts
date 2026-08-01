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
  await authedPage.getByPlaceholder('Tìm theo tên, khu vực...').fill(`E2E Page Item ${suffix}`);

  // The search box applies to the list on a 300ms debounce (SEARCH_DEBOUNCE_MS
  // in PostList.tsx). Neither "row count is 6" nor "one of this run's titles
  // is visible" is a reliable ready-signal here: the E2E DB accumulates OPEN
  // SUPPLY posts across every previous run (see e2e/README.md — this instance
  // has 100+ by now), sorted newest first, so this run's 7 brand-new posts
  // land on page 1 of the *unfiltered* list too, and the *unfiltered* total
  // is easily >12 pages — both checks can pass, and a "3" page button can
  // exist, before the debounce has actually applied. Rather than guess how
  // long that takes under whatever load the dev server is under, poll for
  // the one thing that's only ever true post-filter (no page 3) with a
  // generous timeout instead of a fixed sleep.
  await expect(authedPage.getByRole('button', { name: '3' })).toHaveCount(0, { timeout: 20_000 });
  await expect(authedPage.locator('[class*="postRow"]')).toHaveCount(6);

  // exact: true — the logged-in user's name in the header button can itself
  // contain "2" as a substring, colliding with the page-number button.
  const page2Button = authedPage.getByRole('button', { name: '2', exact: true });
  await expect(page2Button).toBeVisible();

  await page2Button.click();
  await expect(authedPage.locator('[class*="postRow"]')).toHaveCount(1);
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
