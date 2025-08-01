import { test, expect, registerAndLogin } from '../fixtures';
import { uniqueSuffix } from '../helpers/random';
import { TEST_PNG_BUFFER } from '../helpers/testImage';
import { gotoViaUserMenu } from '../helpers/nav';

const TEST_IMAGE_FILE = { name: 'e2e-avatar.png', mimeType: 'image/png', buffer: TEST_PNG_BUFFER };

// NOTE: /profile and /profile/edit are reached via the header's UserMenu
// (gotoViaUserMenu) rather than a direct authedPage.goto(...) — see
// e2e/helpers/nav.ts for why a hard load of these pages currently redirects
// to /login even when authenticated.

test('own profile shows the registered user\'s info, with an unset phone shown as "Chưa cập nhật"', async ({
  authedPage,
  user,
}) => {
  await gotoViaUserMenu(authedPage, user.name, 'Tài khoản');
  await expect(authedPage.getByText(user.name)).toBeVisible();
  await expect(authedPage.getByText(user.email)).toBeVisible();
  await expect(authedPage.getByText('Chưa cập nhật')).toBeVisible();
});

test('editing the profile updates name, phone, visibility toggles and avatar', async ({ authedPage, user }) => {
  const newName = `E2E Edited Name ${uniqueSuffix()}`;
  const newPhone = '0909123456';

  await gotoViaUserMenu(authedPage, user.name, 'Tài khoản');
  // Two links share this accessible name (the avatar pencil badge and the
  // primary button) — both go to the same place, so just take the first.
  await authedPage.getByRole('link', { name: 'Chỉnh sửa hồ sơ' }).first().click();
  await expect(authedPage).toHaveURL('/profile/edit');

  await authedPage.locator('input[type="file"]').setInputFiles(TEST_IMAGE_FILE);
  await expect(authedPage.getByText('Chỉnh ảnh đại diện')).toBeVisible();
  await authedPage.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(authedPage.getByText('Chỉnh ảnh đại diện')).toHaveCount(0);

  await authedPage.locator('#name').fill(newName);
  await authedPage.locator('#phone').fill(newPhone);
  await authedPage.getByRole('checkbox', { name: /Hiển thị số điện thoại công khai/ }).uncheck();
  await authedPage.getByRole('checkbox', { name: /Hiển thị email công khai/ }).check();

  await authedPage.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(authedPage.getByRole('status')).toHaveText('Cập nhật hồ sơ thành công!');

  await expect(authedPage).toHaveURL('/profile', { timeout: 5000 });
  const main = authedPage.getByRole('main');
  await expect(main.getByText(newName)).toBeVisible();
  await expect(main.getByText(newPhone)).toBeVisible();
  await expect(main.getByRole('img', { name: newName })).toHaveAttribute('src', /\/uploads\/avatars\//);
});

test('public profile only shows phone/email when the owner has made them public', async ({
  authedPage,
  request,
  apiURL,
}) => {
  const owner = await registerAndLogin(request);
  const phone = '0909988776';

  async function setVisibility(showPhonePublicly: boolean, showEmailPublicly: boolean) {
    const res = await request.patch(`${apiURL}/users/${owner.authUser.id}`, {
      data: { phone, showPhonePublicly, showEmailPublicly },
      headers: { Authorization: `Bearer ${owner.accessToken}` },
    });
    if (!res.ok()) {
      throw new Error(`Failed to update E2E owner visibility: ${res.status()} ${await res.text()}`);
    }
  }

  await setVisibility(true, true);
  await authedPage.goto(`/users/${owner.authUser.id}`);
  await expect(authedPage.getByText(phone)).toBeVisible();
  await expect(authedPage.getByText(owner.email)).toBeVisible();

  await setVisibility(false, false);
  await authedPage.goto(`/users/${owner.authUser.id}`);
  await expect(authedPage.getByText(phone)).toHaveCount(0);
  await expect(authedPage.getByText(owner.email)).toHaveCount(0);
});
