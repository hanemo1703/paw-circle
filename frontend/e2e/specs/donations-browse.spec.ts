import { test, expect } from '../fixtures';
import { createCampaign } from '../helpers/api';
import { uniqueSuffix } from '../helpers/random';

// The E2E Postgres accumulates campaigns across runs (see e2e/README.md), so
// these tests never assert on the *total* number of campaigns in a list —
// only on campaigns matching a per-test unique title/suffix, searched for via
// the list page's search box, so historical data from other runs can't
// interfere.

test('search filters the campaign list down to a single matching campaign', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const suffix = uniqueSuffix();
  const title = `E2E Search Campaign ${suffix}`;
  await createCampaign(request, apiURL, user.accessToken, { title });

  await authedPage.goto('/donations');
  await authedPage.getByPlaceholder('Tìm chiến dịch theo tên, khu vực...').fill(suffix);
  // Search input is debounced by 300ms before it's applied to the list.
  await expect(authedPage.getByText(title)).toBeVisible({ timeout: 5000 });
  await expect(authedPage.locator('a[class*="card"]', { hasText: title })).toHaveCount(1);
});

test('status filter chips control which campaigns are visible', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const suffix = uniqueSuffix();
  const activeTitle = `E2E Campaign Active ${suffix}`;
  const doneTitle = `E2E Campaign Done ${suffix}`;

  await createCampaign(request, apiURL, user.accessToken, { title: activeTitle });
  await createCampaign(request, apiURL, user.accessToken, { title: doneTitle, status: 'COMPLETED' });

  await authedPage.goto('/donations');
  await authedPage.getByPlaceholder('Tìm chiến dịch theo tên, khu vực...').fill(suffix);

  // Default status filter is "Đang gây quỹ" (ACTIVE) only — the completed
  // campaign is hidden until its chip is toggled on.
  await expect(authedPage.getByText(activeTitle)).toBeVisible({ timeout: 5000 });
  await expect(authedPage.getByText(doneTitle)).toHaveCount(0);

  await authedPage.getByText('Đã hoàn thành', { exact: true }).click();

  await expect(authedPage.getByText(doneTitle)).toBeVisible();
});

test('pagination splits campaigns matching the search into pages of 6', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const suffix = uniqueSuffix();
  for (let i = 1; i <= 7; i++) {
    await createCampaign(request, apiURL, user.accessToken, {
      title: `E2E Page Campaign ${suffix}-${i}`,
    });
  }

  await authedPage.goto('/donations');

  // Same effect-ordering race as PostList.tsx (see posts-browse.spec.ts): this
  // page's own `setPage(1)` reset effect and its data-fetch effect are two
  // separate effects, so a DOM-content-based readiness check is unreliable —
  // wait for the network response itself to confirm the search has actually
  // filtered down to exactly our 7 seeded campaigns before touching the pager.
  const filteredResponse = authedPage.waitForResponse(async (res) => {
    if (
      !res.url().includes('/donations/campaigns') ||
      !res.url().includes('search=') ||
      !res.url().includes('page=1')
    ) {
      return false;
    }
    try {
      return (await res.json()).total === 7;
    } catch {
      return false;
    }
  }, { timeout: 20_000 });
  await authedPage.getByPlaceholder('Tìm chiến dịch theo tên, khu vực...').fill(`E2E Page Campaign ${suffix}`);
  await filteredResponse;

  await expect(authedPage.locator('a[class*="card"]')).toHaveCount(6);

  // exact: true — the logged-in user's name in the header button can itself
  // contain "2" as a substring, colliding with the page-number button.
  const page2Button = authedPage.getByRole('button', { name: '2', exact: true });
  await expect(page2Button).toBeVisible();

  await page2Button.click();
  await expect(authedPage.locator('a[class*="card"]')).toHaveCount(1);
  await expect(authedPage.locator('a[class*="card"] h3')).toHaveText(`E2E Page Campaign ${suffix}-1`);
});
