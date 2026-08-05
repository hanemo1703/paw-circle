import { test, expect } from '../fixtures';
import { createCampaign, donate } from '../helpers/api';
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

test('category filter chips control which campaigns are visible', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const suffix = uniqueSuffix();
  const foodTitle = `E2E Campaign Food ${suffix}`;
  const medicalTitle = `E2E Campaign Medical ${suffix}`;

  await createCampaign(request, apiURL, user.accessToken, { title: foodTitle, category: 'FOOD_SUPPLIES' });
  await createCampaign(request, apiURL, user.accessToken, { title: medicalTitle, category: 'MEDICAL' });

  await authedPage.goto('/donations');
  await authedPage.getByPlaceholder('Tìm chiến dịch theo tên, khu vực...').fill(suffix);

  // All 3 categories are checked by default (unlike status, which defaults to
  // ACTIVE-only) — both show up without touching any chip.
  await expect(authedPage.getByText(foodTitle)).toBeVisible({ timeout: 5000 });
  await expect(authedPage.getByText(medicalTitle)).toBeVisible();

  await authedPage.getByText('Thức ăn - Cát mèo', { exact: true }).click();

  await expect(authedPage.getByText(medicalTitle)).toBeVisible();
  await expect(authedPage.getByText(foodTitle)).toHaveCount(0);
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

test('sort dropdown reorders campaigns by deadline and by funding progress', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const suffix = uniqueSuffix();
  const titleA = `E2E Sort Campaign A ${suffix}`;
  const titleB = `E2E Sort Campaign B ${suffix}`;

  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const far = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // A: created first (so it's NOT "newest"), but has a near deadline and high
  // funding progress — flips the default order under both alternate sorts.
  const campaignA = await createCampaign(request, apiURL, user.accessToken, {
    title: titleA,
    deadline: soon,
    targetAmount: 100_000,
  });
  await donate(request, apiURL, user.accessToken, campaignA.id, { amount: 90_000 });
  // B: created second (so it IS "newest"), but has a far-off deadline and no
  // donations yet.
  await createCampaign(request, apiURL, user.accessToken, {
    title: titleB,
    deadline: far,
    targetAmount: 100_000,
  });

  await authedPage.goto('/donations');
  await authedPage.getByPlaceholder('Tìm chiến dịch theo tên, khu vực...').fill(suffix);
  await expect(authedPage.getByText(titleA)).toBeVisible({ timeout: 5000 });

  // Default sort is "Mới nhất" (createdAt DESC) — B (created after A) first.
  await expect(authedPage.locator('a[class*="card"] h3')).toHaveText([titleB, titleA]);

  async function selectSort(label: string, sortParam: string) {
    const response = authedPage.waitForResponse(async (res) => {
      if (
        !res.url().includes('/donations/campaigns') ||
        !res.url().includes(`sort=${sortParam}`) ||
        !res.url().includes('search=')
      ) {
        return false;
      }
      try {
        return (await res.json()).total === 2;
      } catch {
        return false;
      }
    }, { timeout: 10_000 });
    // The trigger's accessible name is whichever sort option is currently selected.
    await authedPage.getByRole('button', { name: /Mới nhất|Sắp hết hạn|Gần đạt mục tiêu/ }).click();
    await authedPage.getByRole('listbox').getByRole('button', { name: label, exact: true }).click();
    await response;
  }

  // Deadline ASC (NULLS LAST) — A's near deadline sorts before B's far one.
  await selectSort('Sắp hết hạn', 'deadline');
  await expect(authedPage.locator('a[class*="card"] h3')).toHaveText([titleA, titleB]);

  // Progress DESC — A's 90% funded sorts before B's 0%.
  await selectSort('Gần đạt mục tiêu', 'progress');
  await expect(authedPage.locator('a[class*="card"] h3')).toHaveText([titleA, titleB]);
});
