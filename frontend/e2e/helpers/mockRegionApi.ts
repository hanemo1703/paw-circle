import { Page } from '@playwright/test';

// Fixed, fake dataset — deliberately distinct from any real Vietnamese province/ward
// name so assertions can't accidentally match real data returned by a slow/flaky call.
export const MOCK_PROVINCES = [
  {
    code: 9001,
    name: 'Tỉnh E2E Test A',
    wards: [
      { code: 90011, name: 'Phường E2E Một' },
      { code: 90012, name: 'Phường E2E Hai' },
    ],
  },
  {
    code: 9002,
    name: 'Tỉnh E2E Test B',
    wards: [{ code: 90021, name: 'Phường E2E Ba' }],
  },
];

// Stubs provinces.open-api.vn — used by the create/edit post forms' Khu vực
// dropdowns and the post-list "Khu vực" filter. Real calls to this third-party
// API are the slowest and flakiest part of any test touching region pickers
// (flagged as a known gap in Phase 1), so tests that need deterministic
// province/ward options should call this before navigating.
export async function mockRegionApi(page: Page): Promise<void> {
  await page.route('https://provinces.open-api.vn/api/v2/p/**', async (route) => {
    const url = new URL(route.request().url());
    const depthTwo = url.searchParams.get('depth') === '2';
    const codeSegment = url.pathname.replace(/^\/api\/v2\/p\/?/, '');

    if (depthTwo && codeSegment) {
      const province = MOCK_PROVINCES.find((p) => p.code === Number(codeSegment));
      await route.fulfill({ json: province ?? null });
      return;
    }

    await route.fulfill({ json: MOCK_PROVINCES.map(({ code, name }) => ({ code, name })) });
  });
}
