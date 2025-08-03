import { APIRequestContext } from '@playwright/test';
import { uniqueSuffix } from './random';

export type PostType = 'LOST' | 'ADOPTION' | 'SUPPLY' | 'TRADE';

export interface CreatePostOverrides {
  type: PostType;
  title?: string;
  description?: string;
  price?: number;
  species?: string;
  provinceCode?: number;
  wardCode?: number;
  latitude?: number;
  longitude?: number;
  pets?: Array<{ species: string; gender?: 'MALE' | 'FEMALE' | 'UNKNOWN' }>;
}

export interface CreatedPost {
  id: string;
  type: PostType;
  title: string;
}

// Seeds a post directly against the backend (bypassing the create form) so
// detail/edit/delete/browse tests don't have to re-drive the create UI just
// to get a post to work with — that flow is covered separately in
// posts-create.spec.ts.
export async function createPost(
  request: APIRequestContext,
  apiURL: string,
  accessToken: string,
  overrides: CreatePostOverrides,
): Promise<CreatedPost> {
  const suffix = uniqueSuffix();
  const body = {
    title: `E2E post ${suffix}`,
    description: `Mô tả tạo tự động cho bài kiểm thử E2E ${suffix}.`,
    ...(overrides.type === 'TRADE' ? { price: 100000 } : {}),
    // The edit form's species dropdown falls back to "Khác" (OTHER, which
    // requires a free-text value) whenever `post.species` is falsy — default
    // it here so LOST/TRADE posts seeded for edit/manage tests don't trip
    // that required-field validation on load.
    ...(overrides.type !== 'SUPPLY' && overrides.type !== 'ADOPTION' ? { species: 'Mèo' } : {}),
    ...overrides,
  };

  const res = await request.post(`${apiURL}/posts`, {
    data: body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok()) {
    throw new Error(`Failed to seed E2E post: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export interface CreateCampaignOverrides {
  title?: string;
  description?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  targetAmount?: number;
  deadline?: string;
  contactPhone?: string;
  contactEmail?: string;
  pickupAddress?: string;
}

export interface CreatedCampaign {
  id: string;
  title: string;
  status: string;
}

// Seeds a donation campaign directly against the backend, same rationale as
// createPost above: tests that aren't exercising the create form itself
// shouldn't have to re-drive it just to get fixture data.
//
// DonationsService.createCampaign() rejects campaigns with no way to actually
// receive money (neither a complete bank account nor a QR image) — a plain
// title/description body isn't enough, so a placeholder qrImageUrl is
// included by default (any non-empty string is accepted, same as donate()'s
// proofImageUrl below). `category` also defaults away from the entity's own
// default (OTHER), since OTHER requires a non-empty `categoryOther` on the
// edit form's own client-side validation the moment it round-trips a
// campaign that has OTHER with no categoryOther text ever set.
export async function createCampaign(
  request: APIRequestContext,
  apiURL: string,
  accessToken: string,
  overrides: CreateCampaignOverrides = {},
): Promise<CreatedCampaign> {
  const suffix = uniqueSuffix();
  const { status, ...campaignFields } = overrides;
  const body = {
    title: `E2E campaign ${suffix}`,
    description: `Mô tả chiến dịch kiểm thử E2E ${suffix}.`,
    category: 'FOOD_SUPPLIES',
    qrImageUrl: '/uploads/donations/e2e-seed-qr.png',
    ...campaignFields,
  };

  const res = await request.post(`${apiURL}/donations/campaigns`, {
    data: body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok()) {
    throw new Error(`Failed to seed E2E campaign: ${res.status()} ${await res.text()}`);
  }
  const campaign: CreatedCampaign = await res.json();

  if (status && status !== campaign.status) {
    const patchRes = await request.patch(`${apiURL}/donations/campaigns/${campaign.id}`, {
      data: { status },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!patchRes.ok()) {
      throw new Error(`Failed to set E2E campaign status: ${patchRes.status()} ${await patchRes.text()}`);
    }
    return patchRes.json();
  }

  return campaign;
}

export interface DonateOverrides {
  amount?: number;
  message?: string;
  anonymous?: boolean;
  proofImageUrl?: string;
}

// Seeds a donation directly against the backend. `proofImageUrl` is required
// by CreateDonationDto but isn't validated as a real uploaded path, so any
// non-empty string is accepted here.
export async function donate(
  request: APIRequestContext,
  apiURL: string,
  accessToken: string,
  campaignId: string,
  overrides: DonateOverrides = {},
) {
  const body = {
    amount: 50_000,
    proofImageUrl: '/uploads/donations/e2e-seed-proof.png',
    ...overrides,
  };

  const res = await request.post(`${apiURL}/donations/campaigns/${campaignId}/donate`, {
    data: body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok()) {
    throw new Error(`Failed to seed E2E donation: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Seeds a single message directly against the backend — used to bulk-create
// long threads (e.g. for infinite-scroll-up tests) without driving the
// composer UI once per message.
export async function sendMessage(
  request: APIRequestContext,
  apiURL: string,
  accessToken: string,
  receiverId: string,
  content: string,
) {
  const res = await request.post(`${apiURL}/messages/${receiverId}`, {
    data: { content },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok()) {
    throw new Error(`Failed to seed E2E message: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}
