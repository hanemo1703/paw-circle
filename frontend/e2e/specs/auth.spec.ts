import { test, expect } from '../fixtures';
import { randomTestEmail, randomTestName } from '../helpers/random';

const PASSWORD = 'Test1234!';

test('register -> login -> logout via the real UI forms', async ({ page }) => {
  const email = randomTestEmail();
  const name = randomTestName();

  await page.goto('/register');
  await page.getByLabel('Họ tên').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng ký' }).click();

  // LoginPage strips the ?registered=1 query almost immediately via a
  // shallow router.replace once it's read it, so asserting on the query
  // string itself is a race — match the base path and rely on the toast
  // (which persists) to confirm the registered-redirect actually happened.
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('status')).toHaveText('Đăng ký thành công! Vui lòng đăng nhập.');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(PASSWORD);
  // exact: true — this env has Facebook login configured, and its button
  // text "Đăng nhập với Facebook" contains "Đăng nhập" as a substring.
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name })).toBeVisible();

  await page.getByRole('button', { name }).click();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();

  await expect(page.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
});

test('forgot-password shows a generic success message', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(randomTestEmail());
  await page.getByRole('button', { name: 'Gửi liên kết đặt lại mật khẩu' }).click();

  await expect(
    page.getByText('một liên kết đặt lại mật khẩu đã', { exact: false }),
  ).toBeVisible();
});

test('reset-password without a token shows an invalid-link message', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByText('Liên kết đặt lại mật khẩu không hợp lệ.')).toBeVisible();
});

test('reset-password validates that passwords match', async ({ page }) => {
  await page.goto('/reset-password?token=not-a-real-token');
  // exact: true — "Xác nhận mật khẩu mới" contains "Mật khẩu mới" as a
  // substring, so the non-exact getByLabel matches both fields.
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('abcdef');
  await page.getByLabel('Xác nhận mật khẩu mới').fill('different');
  await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();

  await expect(page.getByText('Mật khẩu xác nhận không khớp.')).toBeVisible();
});

test('an already-authenticated session can load a protected page directly', async ({ authedPage }) => {
  // /donations/new delays its auth redirect by one extra render tick
  // (`checkingAuth`) specifically to avoid a redirect race while
  // AuthProvider's mount-time localStorage read is still in flight — a more
  // reliable target for this check than a page with a plain isAuthenticated
  // guard (e.g. /profile), where that race is untested.
  await authedPage.goto('/donations/new');

  await expect(authedPage).toHaveURL('/donations/new');
  await expect(authedPage.getByRole('heading', { name: 'Tạo chiến dịch gây quỹ' })).toBeVisible();
});
