import { test, expect, registerAndLogin } from '../fixtures';
import { createCampaign, donate } from '../helpers/api';
import { uniqueSuffix } from '../helpers/random';

// Sends a message directly via the backend API (rather than driving a second
// browser context through the UI) — this exercises the exact same
// MessagesService.send() path that creates the notification and pushes it
// over the socket, regardless of whether the send came from a UI click or a
// raw API call, and keeps these tests focused on the notifications UI itself.
async function sendMessageFrom(
  request: import('@playwright/test').APIRequestContext,
  apiURL: string,
  sender: { accessToken: string },
  receiverId: string,
  content: string,
) {
  const res = await request.post(`${apiURL}/messages/${receiverId}`, {
    data: { content },
    headers: { Authorization: `Bearer ${sender.accessToken}` },
  });
  if (!res.ok()) {
    throw new Error(`Failed to seed E2E message: ${res.status()} ${await res.text()}`);
  }
}

test('the notifications bell shows a new message, and opening it navigates and marks it read', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const sender = await registerAndLogin(request);
  const bellButton = authedPage.getByRole('button', { name: 'Thông báo' });

  await authedPage.goto('/');
  await expect(bellButton).toBeVisible();
  // Give the page's initial notifications fetch + socket connection time to
  // settle before triggering the push, same rationale as messages.spec.ts's
  // realtime test.
  await authedPage.waitForResponse((res) => res.url().includes('/notifications') && res.request().method() === 'GET');

  await sendMessageFrom(request, apiURL, sender, user.authUser.id, `E2E notif ${uniqueSuffix()}`);

  await expect(bellButton.locator('[class*="unreadBadge"]')).toHaveText('1', { timeout: 10_000 });

  await bellButton.click();
  await expect(authedPage.getByText(`${sender.name} đã gửi cho bạn một tin nhắn mới`)).toBeVisible();

  await authedPage.getByText(`${sender.name} đã gửi cho bạn một tin nhắn mới`).click();
  await expect(authedPage).toHaveURL(`/messages/${sender.authUser.id}`);
  await expect(bellButton.locator('[class*="unreadBadge"]')).toHaveCount(0);
});

test('a donation to your campaign shows a DONATION-type notification, and opening it navigates and marks it read', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const donor = await registerAndLogin(request);
  const campaign = await createCampaign(request, apiURL, user.accessToken);
  const bellButton = authedPage.getByRole('button', { name: 'Thông báo' });

  await authedPage.goto('/');
  await expect(bellButton).toBeVisible();
  await authedPage.waitForResponse((res) => res.url().includes('/notifications') && res.request().method() === 'GET');

  await donate(request, apiURL, donor.accessToken, campaign.id, { amount: 50_000 });

  await expect(bellButton.locator('[class*="unreadBadge"]')).toHaveText('1', { timeout: 10_000 });

  const content = `${donor.name} vừa ủng hộ 50.000đ cho chiến dịch "${campaign.title}"`;
  await bellButton.click();
  await expect(authedPage.getByText(content)).toBeVisible();

  await authedPage.getByText(content).click();
  await expect(authedPage).toHaveURL(`/donations/${campaign.id}`);
  await expect(bellButton.locator('[class*="unreadBadge"]')).toHaveCount(0);
});

test('"mark all read" clears the notifications badge', async ({ authedPage, user, request, apiURL }) => {
  const senderA = await registerAndLogin(request);
  const senderB = await registerAndLogin(request);
  const bellButton = authedPage.getByRole('button', { name: 'Thông báo' });

  await authedPage.goto('/');
  await expect(bellButton).toBeVisible();
  await authedPage.waitForResponse((res) => res.url().includes('/notifications') && res.request().method() === 'GET');

  await sendMessageFrom(request, apiURL, senderA, user.authUser.id, `E2E notif A ${uniqueSuffix()}`);
  await sendMessageFrom(request, apiURL, senderB, user.authUser.id, `E2E notif B ${uniqueSuffix()}`);

  await expect(bellButton.locator('[class*="unreadBadge"]')).toHaveText('2', { timeout: 10_000 });

  await bellButton.click();
  await authedPage.getByRole('button', { name: 'Đánh dấu đã đọc hết' }).click();

  await expect(bellButton.locator('[class*="unreadBadge"]')).toHaveCount(0);
});
