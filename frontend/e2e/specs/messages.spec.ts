import { test, expect, registerAndLogin, seedAuthedSession } from '../fixtures';
import { createPost, sendMessage } from '../helpers/api';
import { uniqueSuffix } from '../helpers/random';
import { gotoMessagesViaHeader } from '../helpers/nav';

// NOTE: /messages and /messages/:userId are reached via real in-app link
// clicks (gotoMessagesViaHeader, a post's "message the author" button) rather
// than a direct authedPage.goto(...) — see e2e/helpers/nav.ts for why a hard
// load of these pages currently redirects to /login even when authenticated.

test('inbox shows an empty state for a fresh user', async ({ authedPage }) => {
  await gotoMessagesViaHeader(authedPage);
  await expect(authedPage.getByText('Bạn chưa có cuộc trò chuyện nào.')).toBeVisible();
});

test('opening a fresh thread from a post\'s "message the author" link shows the empty-thread copy, then sending a message shows it in the thread', async ({
  authedPage,
  request,
  apiURL,
}) => {
  const recipient = await registerAndLogin(request);
  const post = await createPost(request, apiURL, recipient.accessToken, { type: 'LOST' });
  const content = `E2E hello ${uniqueSuffix()}`;

  await authedPage.goto(`/posts/${post.id}`);
  await authedPage.getByRole('button', { name: 'Nhắn tin cho người đăng' }).click();
  await expect(authedPage).toHaveURL(`/messages/${recipient.authUser.id}`);
  await expect(authedPage.getByText(`Bắt đầu trò chuyện với ${recipient.name}`)).toBeVisible();

  await authedPage.getByPlaceholder('Nhập tin nhắn...').fill(content);
  await authedPage.getByRole('button', { name: 'Gửi' }).click();

  await expect(authedPage.getByText(content)).toBeVisible();
});

test('sending a message live-updates the recipient\'s open inbox, and reading it there clears the unread badge without a reload', async ({
  authedPage,
  user,
  browser,
  request,
  apiURL,
}) => {
  const peer = await registerAndLogin(request);
  const post = await createPost(request, apiURL, peer.accessToken, { type: 'LOST' });
  const content = `E2E realtime ${uniqueSuffix()}`;

  const peerContext = await browser.newContext();
  const peerInboxPage = await peerContext.newPage();
  await seedAuthedSession(peerInboxPage, peer);
  await gotoMessagesViaHeader(peerInboxPage);
  await expect(peerInboxPage.getByText('Bạn chưa có cuộc trò chuyện nào.')).toBeVisible();

  await authedPage.goto(`/posts/${post.id}`);
  await authedPage.getByRole('button', { name: 'Nhắn tin cho người đăng' }).click();
  await authedPage.getByPlaceholder('Nhập tin nhắn...').fill(content);
  await authedPage.getByRole('button', { name: 'Gửi' }).click();
  await expect(authedPage.getByText(content)).toBeVisible();

  // No reload on peerInboxPage — this only updates if the `message:new` socket
  // push actually reaches it (see MessagesGateway.notifyNewMessage, which pushes
  // to the receiver's own room).
  await expect(peerInboxPage.getByText(content)).toBeVisible({ timeout: 10_000 });
  await expect(peerInboxPage.locator('[class*="unreadDot"]')).toHaveText('1');

  // Opening the thread as the recipient (a second tab, same logged-in user, via
  // the inbox row's own client-side Link) marks it read server-side, which
  // pushes `message:read` back to every socket joined to that user's own room —
  // including the still-open inbox tab, which should clear its badge with no
  // reload of its own.
  const peerThreadPage = await peerContext.newPage();
  await gotoMessagesViaHeader(peerThreadPage);
  await peerThreadPage.getByText(content).click();
  await expect(peerThreadPage).toHaveURL(`/messages/${user.authUser.id}`);
  await expect(peerThreadPage.getByText(content)).toBeVisible();

  await expect(peerInboxPage.locator('[class*="unreadDot"]')).toHaveCount(0, { timeout: 10_000 });

  await peerContext.close();
});

test('scrolling to the top of a long thread loads older message history', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const recipient = await registerAndLogin(request);
  const suffix = uniqueSuffix();

  // Default thread page size is 50 (MessagesService.conversation) — seed 55 so
  // the oldest 5 only load on scroll-up.
  for (let i = 1; i <= 55; i++) {
    await sendMessage(request, apiURL, user.accessToken, recipient.authUser.id, `E2E msg ${suffix} #${i}`);
  }

  await gotoMessagesViaHeader(authedPage);
  await authedPage.getByText(`E2E msg ${suffix} #55`).click();
  await expect(authedPage).toHaveURL(`/messages/${recipient.authUser.id}`);

  // The newest 50 of the 55 seeded messages are #6-#55 — #1-#5 only load on scroll-up.
  await expect(authedPage.getByText(`E2E msg ${suffix} #6`, { exact: true })).toBeVisible();
  await expect(authedPage.getByText(`E2E msg ${suffix} #1`, { exact: true })).toHaveCount(0);

  const olderHistoryResponse = authedPage.waitForResponse(
    (res) => res.url().includes(`/messages/${recipient.authUser.id}`) && res.url().includes('before='),
    { timeout: 10_000 },
  );
  await authedPage.locator('[class*="msgList"]').evaluate((el) => {
    el.scrollTop = 0;
  });
  await olderHistoryResponse;

  await expect(authedPage.getByText(`E2E msg ${suffix} #1`, { exact: true })).toBeVisible();
});

test('inbox pagination splits conversations into pages of 20', async ({ authedPage, user, request, apiURL }) => {
  // Conversations are grouped by counterpart, not by message count — 20/page
  // needs 21 distinct partners, not 21 messages to the same person.
  const partners = await Promise.all(Array.from({ length: 21 }, () => registerAndLogin(request)));
  await Promise.all(
    partners.map((partner) =>
      sendMessage(request, apiURL, user.accessToken, partner.authUser.id, 'E2E inbox pagination seed'),
    ),
  );

  await gotoMessagesViaHeader(authedPage);

  await expect(authedPage.locator('[class*="msgRow"]')).toHaveCount(20);

  // exact: true — the logged-in user's name in the header button can itself
  // contain "2" as a substring, colliding with the page-number button.
  const page2Button = authedPage.getByRole('button', { name: '2', exact: true });
  await expect(page2Button).toBeVisible();
  await page2Button.click();

  await expect(authedPage.locator('[class*="msgRow"]')).toHaveCount(1);
});
