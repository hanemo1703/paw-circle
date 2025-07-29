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
