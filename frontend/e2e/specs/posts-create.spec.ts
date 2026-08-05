import { test, expect } from '../fixtures';
import { uniqueSuffix } from '../helpers/random';
import { mockRegionApi } from '../helpers/mockRegionApi';
import { PostType } from '../helpers/api';
import { TEST_PNG_BUFFER } from '../helpers/testImage';

const TEST_IMAGE_FILE = { name: 'e2e-post-image.png', mimeType: 'image/png', buffer: TEST_PNG_BUFFER };

interface TypeCase {
  type: PostType;
  listPath: string;
}

const TYPE_CASES: TypeCase[] = [
  { type: 'LOST', listPath: '/lost-found' },
  { type: 'ADOPTION', listPath: '/adoption' },
  { type: 'SUPPLY', listPath: '/marketplace' },
  { type: 'TRADE', listPath: '/trade' },
];

// Selects a province/ward pair from the mocked region dataset (see
// mockRegionApi.ts) via the portaled custom Dropdown — open the trigger,
// then click the matching option out of the listbox it renders.
async function selectRegion(page: import('@playwright/test').Page) {
  await page.locator('#province').click();
  await page.getByRole('listbox').getByRole('button', { name: 'Tỉnh E2E Test A' }).click();
  await page.locator('#ward').click();
  await page.getByRole('listbox').getByRole('button', { name: 'Phường E2E Một' }).click();
}

for (const { type, listPath } of TYPE_CASES) {
  test(`creating a ${type} post via the real form redirects to ${listPath} and shows the new post`, async ({
    authedPage,
  }) => {
    const title = `E2E create ${type} ${uniqueSuffix()}`;

    await mockRegionApi(authedPage);
    await authedPage.goto(`/posts/new?type=${type}`);

    await authedPage.getByLabel('Tiêu đề').fill(title);
    // The required-field asterisk is a child <span>, so the accessible name
    // is actually "Mô tả*" (not "Mô tả") — and "Mô tả vòng cổ/thẻ bài..."
    // (LOST-only) also contains "Mô tả" as a substring, so anchor with ^/$.
    await authedPage.getByLabel(/^Mô tả\*?$/).fill(`Mô tả tự động cho tin ${type}.`);

    if (type === 'TRADE') {
      await authedPage.getByLabel('Giá (đ)').fill('150000');
    }

    await selectRegion(authedPage);

    await authedPage.getByRole('button', { name: 'Đăng tin' }).click();

    // The list page strips ?created=1 via a shallow router.replace almost
    // immediately (see smoke-nav/auth specs for the same pattern), so match
    // the base path and rely on the toast to confirm the redirect landed.
    await expect(authedPage).toHaveURL(new RegExp(`${listPath}(\\?|$)`));
    await expect(authedPage.getByRole('status')).toHaveText('Đăng tin thành công!');
    await expect(authedPage.getByText(title)).toBeVisible();
  });
}

test('attaching an image on the create form uploads it and shows on the post detail page', async ({ authedPage }) => {
  const title = `E2E create LOST with image ${uniqueSuffix()}`;

  await mockRegionApi(authedPage);
  await authedPage.goto('/posts/new?type=LOST');

  await authedPage.getByLabel('Tiêu đề').fill(title);
  await authedPage.getByLabel(/^Mô tả\*?$/).fill('Mô tả tự động cho tin có ảnh.');
  await authedPage.locator('#images').setInputFiles(TEST_IMAGE_FILE);
  await expect(authedPage.locator('[class*="imageTile"]')).toHaveCount(1);

  await selectRegion(authedPage);
  await authedPage.getByRole('button', { name: 'Đăng tin' }).click();

  await expect(authedPage.getByRole('status')).toHaveText('Đăng tin thành công!');
  await authedPage.getByText(title).click();

  const mainImage = authedPage.getByRole('img', { name: title });
  await expect(mainImage).toBeVisible();
  await expect(mainImage).not.toHaveAttribute('src', '/logo.jpg');
});
