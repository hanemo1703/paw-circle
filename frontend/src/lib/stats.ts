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
    const [lostResolved, adoptionOpen, campaigns] = await Promise.all([
      api.get('/posts?type=LOST&status=RESOLVED&limit=1'),
      // Needs the actual post bodies (to sum pets-per-post), not just a count — capped at
      // the backend's max limit (500) so it stays a bounded query.
      api.get('/posts?type=ADOPTION&status=OPEN&limit=500'),
      api.get('/donations/campaigns?status=ACTIVE&limit=1'),
    ]);
    reunitedCount = lostResolved.total;
    pendingAdoptionCount = adoptionOpen.data.reduce(
      (sum: number, post: { pets?: unknown[] }) => sum + (post.pets?.length || 1),
      0,
    );
    activeCampaignCount = campaigns.total;
  } catch {
    // Backend not running — callers render fallback copy
  }

  return { reunitedCount, pendingAdoptionCount, activeCampaignCount };
}
