import { api } from './api';

export interface SiteStats {
  reunitedCount: number;
  pendingAdoptionCount: number;
  activeCampaignCount: number;
}

// Shared by the landing page and the About page, both of which show the same
// "bé đã đoàn tụ / bé đang chờ nhà mới / chiến dịch gây quỹ" callout numbers.
export async function fetchSiteStats(): Promise<SiteStats> {
  let reunitedCount = 0;
  let pendingAdoptionCount = 0;
  let activeCampaignCount = 0;

  try {
    const [lostResolved, foundResolved, adoptionOpen, campaigns] = await Promise.all([
      api.get('/posts?type=LOST&status=RESOLVED'),
      api.get('/posts?type=FOUND&status=RESOLVED'),
      api.get('/posts?type=ADOPTION&status=OPEN'),
      api.get('/donations/campaigns'),
    ]);
    reunitedCount = lostResolved.length + foundResolved.length;
    pendingAdoptionCount = adoptionOpen.reduce(
      (sum: number, post: { pets?: unknown[] }) => sum + (post.pets?.length || 1),
      0,
    );
    activeCampaignCount = campaigns.filter((c: { status: string }) => c.status === 'ACTIVE').length;
  } catch {
    // Backend not running — callers render fallback copy
  }

  return { reunitedCount, pendingAdoptionCount, activeCampaignCount };
}
