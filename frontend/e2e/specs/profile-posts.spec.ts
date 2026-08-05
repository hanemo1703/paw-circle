import { test, expect, registerAndLogin } from '../fixtures';
import { createPost } from '../helpers/api';
import { uniqueSuffix } from '../helpers/random';
import { gotoViaUserMenu } from '../helpers/nav';

// "Bài post của tôi" (profile/posts.tsx) is the only place PostList renders in
// its authorId-scoped, all-types-mixed mode — every listing page (lost-found,
// adoption, marketplace, trade) instead passes a single fixed `type`. These
// tests exercise what's unique to that mode: authorId scoping and the
// combined status chips built by PostList's buildStatusOptions() (statuses
// that share identical wording across types collapse into one chip, e.g.
// every type's CLOSED status reads "Đã đóng tin").

test('empty state shows a prompt and links to create a new LOST post', async ({ authedPage, user }) => {
  await gotoViaUserMenu(authedPage, user.name, 'Bài post của tôi');
  await expect(authedPage).toHaveURL('/profile/posts');
  await expect(authedPage.getByText('Bạn chưa đăng bài nào.')).toBeVisible();
  await expect(authedPage.getByRole('link', { name: '+ Đăng tin mới' })).toHaveAttribute(
    'href',
    '/posts/new?type=LOST',
  );
});

test('shows posts of mixed types for this author only, not another user\'s posts', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const lostTitle = `E2E My Lost ${uniqueSuffix()}`;
  const tradeTitle = `E2E My Trade ${uniqueSuffix()}`;
  await createPost(request, apiURL, user.accessToken, { type: 'LOST', title: lostTitle });
  await createPost(request, apiURL, user.accessToken, { type: 'TRADE', title: tradeTitle });

  const otherUser = await registerAndLogin(request);
  const otherTitle = `E2E Other User Post ${uniqueSuffix()}`;
  await createPost(request, apiURL, otherUser.accessToken, { type: 'LOST', title: otherTitle });

  await gotoViaUserMenu(authedPage, user.name, 'Bài post của tôi');

  await expect(authedPage.getByRole('heading', { name: lostTitle })).toBeVisible();
  await expect(authedPage.getByRole('heading', { name: tradeTitle })).toBeVisible();
  // Each type's OPEN status has distinct wording — both showing (scoped to each
  // post's own row, since the sidebar's status filter chips reuse the same text)
  // confirms the list is genuinely mixed-type, not just displaying one type twice.
  await expect(authedPage.getByRole('link', { name: lostTitle }).getByText('Đang tìm')).toBeVisible();
  await expect(authedPage.getByRole('link', { name: tradeTitle }).getByText('Còn hàng')).toBeVisible();

  await expect(authedPage.getByRole('heading', { name: otherTitle })).toHaveCount(0);
});

test('the combined "Đã đóng tin" status chip filters closed posts across types', async ({
  authedPage,
  user,
  request,
  apiURL,
}) => {
  const closedLostTitle = `E2E Closed Lost ${uniqueSuffix()}`;
  const closedTradeTitle = `E2E Closed Trade ${uniqueSuffix()}`;

  const lostPost = await createPost(request, apiURL, user.accessToken, { type: 'LOST', title: closedLostTitle });
  const tradePost = await createPost(request, apiURL, user.accessToken, { type: 'TRADE', title: closedTradeTitle });

  async function closePost(postId: string) {
    const res = await request.patch(`${apiURL}/posts/${postId}`, {
      data: { status: 'CLOSED' },
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    if (!res.ok()) {
      throw new Error(`Failed to close E2E post: ${res.status()} ${await res.text()}`);
    }
  }
  await closePost(lostPost.id);
  await closePost(tradePost.id);

  await gotoViaUserMenu(authedPage, user.name, 'Bài post của tôi');

  // Default status filter is every type's OPEN chip — the closed posts are
  // hidden until "Đã đóng tin" (shared by all 4 types) is toggled on.
  await expect(authedPage.getByRole('heading', { name: closedLostTitle })).toHaveCount(0);
  await expect(authedPage.getByRole('heading', { name: closedTradeTitle })).toHaveCount(0);

  await authedPage.getByText('Đã đóng tin', { exact: true }).click();

  await expect(authedPage.getByRole('heading', { name: closedLostTitle })).toBeVisible();
  await expect(authedPage.getByRole('heading', { name: closedTradeTitle })).toBeVisible();
});
