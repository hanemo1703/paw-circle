import { test, expect } from '../fixtures';

const PUBLIC_PAGES = ['/', '/about', '/contact', '/lost-found', '/adoption', '/marketplace', '/trade'];

for (const path of PUBLIC_PAGES) {
  test(`${path} renders with header and footer, no console errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(path);

    await expect(page.getByRole('link', { name: 'PawCircle' }).first()).toBeVisible();
    await expect(page.getByText('Mỗi bé đều xứng đáng có một mái nhà.')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
}

const PROTECTED_PAGES = ['/profile', '/messages', '/posts/new', '/donations/new'];

for (const path of PROTECTED_PAGES) {
  test(`unauthenticated visit to ${path} redirects to /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  });
}

// The 4 quad cards on the homepage (frontend/src/pages/index.tsx)
const HOMEPAGE_QUAD_LINKS = [
  { label: 'Tìm thú lạc', href: '/lost-found' },
  { label: 'Nhận nuôi', href: '/adoption' },
  { label: 'Cho tặng đồ dùng', href: '/marketplace' },
  { label: 'Gây quỹ', href: '/donations' },
];

for (const { label, href } of HOMEPAGE_QUAD_LINKS) {
  test(`homepage "${label}" card navigates to ${href}`, async ({ page }) => {
    await page.goto('/');
    // Scoped to the quad-card grid — the hero's "Xem thú cần nhận nuôi"
    // button also contains "Nhận nuôi" as a substring of its accessible name.
    await page.locator('[class*="quadGrid"]').getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(href);
  });
}

const FOOTER_LINKS = [
  { label: 'Về chúng tôi', href: '/about' },
  { label: 'Liên hệ', href: '/contact' },
];

for (const { label, href } of FOOTER_LINKS) {
  test(`footer "${label}" link navigates to ${href}`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(href);
  });
}
