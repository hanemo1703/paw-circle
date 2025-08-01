import { test, expect, registerAndLogin, seedAuthedSession } from '../fixtures';
import { createCampaign } from '../helpers/api';
import { uniqueSuffix } from '../helpers/random';
import { TEST_PNG_BUFFER } from '../helpers/testImage';

const TEST_IMAGE_FILE = { name: 'e2e-test.png', mimeType: 'image/png', buffer: TEST_PNG_BUFFER };

test('creating a campaign via the real form validates funding info and redirects to the detail page', async ({
  authedPage,
}) => {
  const title = `E2E Create Campaign ${uniqueSuffix()}`;

  await authedPage.goto('/donations/new');
  await authedPage.locator('#title').fill(title);
  await authedPage.locator('#description').fill('Mô tả chiến dịch kiểm thử E2E.');
  await authedPage
    .getByRole('checkbox', { name: /Tôi xác nhận thông tin trên là đúng sự thật/ })
    .check();

  // No bank info and no QR image at all.
  await authedPage.getByRole('button', { name: 'Đăng chiến dịch' }).click();
  await expect(
    authedPage.getByText('Vui lòng cung cấp ảnh QR nhận ủng hộ hoặc đầy đủ thông tin ngân hàng để nhận ủng hộ.'),
  ).toBeVisible();

  // Only 2 of the 3 required bank fields filled (bank name dropdown left unselected).
  await authedPage.getByPlaceholder('Số tài khoản').fill('0123456789');
  await authedPage.getByPlaceholder('Chủ tài khoản').fill('Nguyen Van E2E');
  await authedPage.getByRole('button', { name: 'Đăng chiến dịch' }).click();
  await expect(
    authedPage.getByText('Vui lòng điền đầy đủ cả 3 thông tin: ngân hàng, số tài khoản, chủ tài khoản.'),
  ).toBeVisible();

  // Clear the partial bank info and provide a QR image instead — a valid funding branch.
  await authedPage.getByPlaceholder('Số tài khoản').fill('');
  await authedPage.getByPlaceholder('Chủ tài khoản').fill('');
  await authedPage.locator('#qrImage').setInputFiles(TEST_IMAGE_FILE);

  await authedPage.getByRole('button', { name: 'Đăng chiến dịch' }).click();
  await expect(authedPage).toHaveURL(/\/donations\/[^/]+$/);
  await expect(authedPage.getByRole('heading', { name: title })).toBeVisible();
});

test('donating validates the amount and proof image, then updates the donor count', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const campaign = await createCampaign(request, apiURL, user.accessToken);

  await authedPage.goto(`/donations/${campaign.id}`);
  await authedPage.getByRole('button', { name: 'Tôi đã chuyển khoản' }).click();

  await authedPage.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(authedPage.getByText('Vui lòng nhập số tiền hợp lệ (tối thiểu 1.000đ).')).toBeVisible();

  await authedPage.locator('#donateAmount').fill('500');
  await authedPage.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(authedPage.getByText('Vui lòng nhập số tiền hợp lệ (tối thiểu 1.000đ).')).toBeVisible();

  await authedPage.locator('#donateAmount').fill('50000');
  await authedPage.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(authedPage.getByText('Vui lòng đính kèm ảnh chuyển khoản.')).toBeVisible();

  await authedPage.locator('#proofImage').setInputFiles(TEST_IMAGE_FILE);
  await authedPage.getByRole('button', { name: 'Xác nhận' }).click();

  await expect(authedPage.getByRole('status')).toHaveText('Cảm ơn bạn đã ủng hộ chiến dịch!');
  await expect(authedPage.getByText('1 người đã ủng hộ')).toBeVisible();
});

test('owner can mark a campaign completed or closed, which hides the donate button', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const completedCampaign = await createCampaign(request, apiURL, user.accessToken);
  const closedCampaign = await createCampaign(request, apiURL, user.accessToken);

  await authedPage.goto(`/donations/${completedCampaign.id}`);
  await authedPage.getByRole('button', { name: 'Đánh dấu hoàn thành' }).click();
  await authedPage.getByRole('alertdialog').getByRole('button', { name: 'Đánh dấu hoàn thành' }).click();
  await expect(authedPage.locator('[class*="badgeRow"]').getByText('Đã hoàn thành')).toBeVisible();
  await expect(authedPage.getByRole('button', { name: 'Tôi đã chuyển khoản' })).toHaveCount(0);

  await authedPage.goto(`/donations/${closedCampaign.id}`);
  await authedPage.getByRole('button', { name: 'Đóng chiến dịch' }).click();
  await authedPage.getByRole('alertdialog').getByRole('button', { name: 'Đóng chiến dịch' }).click();
  await expect(authedPage.locator('[class*="badgeRow"]').getByText('Đã đóng')).toBeVisible();
  await expect(authedPage.getByRole('button', { name: 'Tôi đã chuyển khoản' })).toHaveCount(0);
});

test('owner can edit a campaign and see the change reflected, then delete it', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const campaign = await createCampaign(request, apiURL, user.accessToken);
  const newTitle = `E2E edited campaign ${uniqueSuffix()}`;

  await authedPage.goto(`/donations/${campaign.id}`);
  await authedPage.getByRole('link', { name: 'Chỉnh sửa chiến dịch' }).click();
  await expect(authedPage).toHaveURL(`/donations/${campaign.id}/edit`);

  await authedPage.locator('#title').fill(newTitle);
  await authedPage.getByRole('button', { name: 'Lưu thay đổi' }).click();

  await expect(authedPage).toHaveURL(`/donations/${campaign.id}`);
  await expect(authedPage.getByRole('heading', { name: newTitle })).toBeVisible();

  await authedPage.goto(`/donations/${campaign.id}/edit`);
  await authedPage.getByRole('button', { name: 'Xóa chiến dịch', exact: true }).click();
  await authedPage.getByRole('alertdialog').getByRole('button', { name: 'Xóa chiến dịch' }).click();

  await expect(authedPage).toHaveURL(/\/donations$/);
});

test('a non-owner sees a message-the-author action instead of owner controls', async ({
  browser,
  user,
  request,
  apiURL,
}) => {
  const campaign = await createCampaign(request, apiURL, user.accessToken);
  const viewer = await registerAndLogin(request);

  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await seedAuthedSession(viewerPage, viewer);

  await viewerPage.goto(`/donations/${campaign.id}`);
  await expect(viewerPage.getByRole('button', { name: 'Nhắn tin cho người đăng' })).toBeVisible();
  await expect(viewerPage.getByRole('link', { name: 'Chỉnh sửa chiến dịch' })).toHaveCount(0);
  await expect(viewerPage.getByRole('button', { name: 'Đánh dấu hoàn thành' })).toHaveCount(0);
  await expect(viewerPage.getByRole('button', { name: 'Đóng chiến dịch' })).toHaveCount(0);

  await viewerPage.getByRole('button', { name: 'Nhắn tin cho người đăng' }).click();
  await expect(viewerPage).toHaveURL(`/messages/${user.authUser.id}`);

  await viewerContext.close();
});
