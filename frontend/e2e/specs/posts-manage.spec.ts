import { test, expect, registerAndLogin, seedAuthedSession } from '../fixtures';
import { createPost } from '../helpers/api';
import { uniqueSuffix } from '../helpers/random';

// Opens a portaled Dropdown by its current trigger label and clicks the
// matching option out of the listbox it renders (see components/Dropdown.tsx).
async function chooseDropdownOption(
  trigger: import('@playwright/test').Locator,
  page: import('@playwright/test').Page,
  optionLabel: string,
) {
  await trigger.click();
  await page.getByRole('listbox').getByRole('button', { name: optionLabel }).click();
}

test('owner can edit a post and see the change reflected on the detail page', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const post = await createPost(request, apiURL, user.accessToken, { type: 'LOST' });
  const newTitle = `E2E edited title ${uniqueSuffix()}`;

  await authedPage.goto(`/posts/${post.id}`);
  await expect(authedPage.getByRole('link', { name: 'Sửa tin' })).toBeVisible();

  await authedPage.getByRole('link', { name: 'Sửa tin' }).click();
  await expect(authedPage).toHaveURL(`/posts/${post.id}/edit`);

  await authedPage.getByLabel('Tiêu đề').fill(newTitle);
  await authedPage.getByRole('button', { name: 'Lưu thay đổi' }).click();

  await expect(authedPage).toHaveURL(`/posts/${post.id}`);
  await expect(authedPage.getByRole('heading', { name: newTitle })).toBeVisible();
});

test('owner can change a post\'s status via the detail-page dropdown', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const post = await createPost(request, apiURL, user.accessToken, { type: 'LOST' });

  await authedPage.goto(`/posts/${post.id}`);
  const badgeRow = authedPage.locator('[class*="badgeRow"]');
  const statusTrigger = badgeRow.getByRole('button', { name: 'Đang tìm' });
  await expect(statusTrigger).toBeVisible();

  await chooseDropdownOption(statusTrigger, authedPage, 'Đã tìm thấy');
  await authedPage.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click();

  await expect(badgeRow.getByRole('button', { name: 'Đã tìm thấy' })).toBeVisible();
});

test('owner can delete a post, which redirects to the list with a confirmation toast', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const post = await createPost(request, apiURL, user.accessToken, { type: 'SUPPLY' });

  await authedPage.goto(`/posts/${post.id}`);
  await authedPage.getByRole('button', { name: 'Xóa tin' }).click();
  await authedPage.getByRole('alertdialog').getByRole('button', { name: 'Xóa tin' }).click();

  // /marketplace strips ?deleted=1 via a shallow router.replace almost
  // immediately (same race as the create-post redirect) — match the base
  // path and rely on the toast to confirm the delete actually happened.
  await expect(authedPage).toHaveURL(/\/marketplace(\?|$)/);
  await expect(authedPage.getByRole('status')).toHaveText('Đã xóa bài đăng.');
});

test('owner can update an individual pet\'s adoption status on an ADOPTION post', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const post = await createPost(request, apiURL, user.accessToken, {
    type: 'ADOPTION',
    pets: [
      { species: 'Mèo E2E', gender: 'UNKNOWN' },
      { species: 'Chó E2E', gender: 'UNKNOWN' },
    ],
  });

  await authedPage.goto(`/posts/${post.id}`);
  const catRow = authedPage.locator('tr', { hasText: 'Mèo E2E' });
  const statusTrigger = catRow.getByRole('button', { name: 'Chờ nhận nuôi' });
  await expect(statusTrigger).toBeVisible();

  await chooseDropdownOption(statusTrigger, authedPage, 'Đã có chủ');

  await expect(catRow.getByRole('button', { name: 'Đã có chủ' })).toBeVisible();
  // The other pet's status is untouched.
  await expect(
    authedPage.locator('tr', { hasText: 'Chó E2E' }).getByRole('button', { name: 'Chờ nhận nuôi' }),
  ).toBeVisible();
});

test('a non-owner sees a message-the-author action instead of owner controls', async ({
  browser,
  user,
  request,
  apiURL,
}) => {
  const post = await createPost(request, apiURL, user.accessToken, { type: 'TRADE' });
  const viewer = await registerAndLogin(request);

  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await seedAuthedSession(viewerPage, viewer);

  await viewerPage.goto(`/posts/${post.id}`);
  await expect(viewerPage.getByRole('button', { name: 'Nhắn tin cho người đăng' })).toBeVisible();
  await expect(viewerPage.getByRole('link', { name: 'Sửa tin' })).toHaveCount(0);
  await expect(viewerPage.getByRole('button', { name: 'Xóa tin' })).toHaveCount(0);

  await viewerPage.getByRole('button', { name: 'Nhắn tin cho người đăng' }).click();
  await expect(viewerPage).toHaveURL(`/messages/${user.authUser.id}`);

  await viewerContext.close();
});
