import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Wallet } from 'lucide-react';
import { toAssetUrl } from '../lib/api';
import MultiSelectDropdown from './MultiSelectDropdown';
import styles from './PostList.module.scss';

// Same source used by the "new post" location picker for Tỉnh/Thành phố options.
const PROVINCES_API_URL = 'https://provinces.open-api.vn/api/v2/p/';

export interface PostItem {
  id: string;
  title: string;
  description: string;
  type: 'LOST' | 'FOUND' | 'ADOPTION' | 'MARKETPLACE' | 'TRADE';
  status?: 'OPEN' | 'RESOLVED' | 'CLOSED';
  price?: number;
  address?: string;
  species?: string;
  images?: string[];
  pets?: unknown[];
  createdAt: string;
}

const SPECIES_FILTER_OPTIONS = [
  { value: 'Chó', label: 'Chó' },
  { value: 'Mèo', label: 'Mèo' },
  { value: 'OTHER', label: 'Khác' },
];

function matchesSpeciesFilter(post: PostItem, speciesFilter: string[]): boolean {
  if (speciesFilter.length === 0) return true;
  if (!post.species) return false;
  if (speciesFilter.includes(post.species)) return true;
  return speciesFilter.includes('OTHER') && post.species !== 'Chó' && post.species !== 'Mèo';
}

// Areas are derived from the tail segment of each post's free-text address
// (e.g. "Phường Cầu Kiều, Thành phố Hồ Chí Minh" -> "Thành phố Hồ Chí Minh").
function areaOf(address?: string): string | null {
  if (!address) return null;
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

const BADGE_CLASS: Record<PostItem['type'], string> = {
  LOST: 'badge badge-lost',
  FOUND: 'badge badge-found',
  ADOPTION: 'badge badge-adoption',
  MARKETPLACE: 'badge badge-found',
  TRADE: 'badge badge-trade',
};

const BADGE_LABEL: Record<PostItem['type'], string> = {
  LOST: 'Bị lạc',
  FOUND: 'Đã tìm thấy',
  ADOPTION: 'Cần người nuôi',
  MARKETPLACE: 'Đồ dùng',
  TRADE: 'Mua bán boss',
};

const STATUS_LABEL: Record<PostItem['type'], Record<'OPEN' | 'RESOLVED' | 'CLOSED', string>> = {
  LOST: { OPEN: 'Đang tìm', RESOLVED: 'Đã tìm thấy', CLOSED: 'Đã đóng tin' },
  FOUND: { OPEN: 'Đang chờ nhận', RESOLVED: 'Đã trả về chủ', CLOSED: 'Đã đóng tin' },
  ADOPTION: { OPEN: 'Còn bé chờ nhận nuôi', RESOLVED: 'Đã có chủ mới', CLOSED: 'Đã đóng tin' },
  MARKETPLACE: { OPEN: 'Còn đồ', RESOLVED: 'Đã cho xong', CLOSED: 'Đã đóng tin' },
  TRADE: { OPEN: 'Còn hàng', RESOLVED: 'Đã bán', CLOSED: 'Đã đóng tin' },
};

const STATUS_VALUES = ['OPEN', 'RESOLVED', 'CLOSED'] as const;

// Builds filter option labels from whatever post types are actually in the list, so the
// wording always matches the status badge shown on each card (e.g. LOST says "Đang tìm",
// FOUND says "Đang chờ nhận" — a page mixing both, like lost-found, joins them with " / ").
function buildStatusOptions(posts: PostItem[]) {
  const typesPresent = Array.from(new Set(posts.map((p) => p.type)));
  const types = typesPresent.length > 0 ? typesPresent : (Object.keys(STATUS_LABEL) as PostItem['type'][]);
  return STATUS_VALUES.map((status) => ({
    value: status,
    label: Array.from(new Set(types.map((type) => STATUS_LABEL[type][status]))).join(' / '),
  }));
}

export default function PostList({
  title,
  posts,
  emptyText,
  newPostType,
}: {
  title: string;
  posts: PostItem[];
  emptyText: string;
  newPostType: PostItem['type'];
}) {
  const [statusFilter, setStatusFilter] = useState<string[]>(['OPEN']);
  const [speciesFilter, setSpeciesFilter] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [areaOptions, setAreaOptions] = useState<{ value: string; label: string }[]>([]);

  const statusOptions = useMemo(() => buildStatusOptions(posts), [posts]);

  useEffect(() => {
    fetch(PROVINCES_API_URL)
      .then((res) => res.json())
      .then((data: { name: string }[]) => {
        const options = data
          .map((p) => ({ value: p.name, label: p.name }))
          .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
        setAreaOptions(options);
      })
      .catch(() => {
        // Provinces API unreachable — Khu vực filter just stays empty
      });
  }, []);

  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        if (statusFilter.length > 0 && (!post.status || !statusFilter.includes(post.status))) {
          return false;
        }
        if (!matchesSpeciesFilter(post, speciesFilter)) {
          return false;
        }
        if (areaFilter.length > 0) {
          const area = areaOf(post.address);
          if (!area || !areaFilter.includes(area)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, statusFilter, speciesFilter, areaFilter]);

  const hasActiveFilters = statusFilter.length > 0 || speciesFilter.length > 0 || areaFilter.length > 0;

  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <Link href={`/posts/new?type=${newPostType}`} className="btn btn-primary">
          + Đăng tin mới
        </Link>
      </div>

      {posts.length > 0 && (
        <div className={styles.filterBar}>
          <MultiSelectDropdown
            label="Trạng thái"
            options={statusOptions}
            selected={statusFilter}
            onChange={setStatusFilter}
          />
          <MultiSelectDropdown
            label="Loài"
            options={SPECIES_FILTER_OPTIONS}
            selected={speciesFilter}
            onChange={setSpeciesFilter}
          />
          <MultiSelectDropdown
            label="Khu vực"
            options={areaOptions}
            selected={areaFilter}
            onChange={setAreaFilter}
          />
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.clearFilters}
              onClick={() => {
                setStatusFilter([]);
                setSpeciesFilter([]);
                setAreaFilter([]);
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {posts.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : filteredPosts.length === 0 ? (
        <p className={styles.empty}>Không tìm thấy tin phù hợp với bộ lọc đã chọn.</p>
      ) : (
        <div className={styles.grid}>
          {filteredPosts.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`} className={styles.card}>
              {post.images && post.images.length > 0 ? (
                <img className={styles.cardImage} src={toAssetUrl(post.images[0])} alt={post.title} />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <img className={styles.placeholderLogo} src="/logo.jpg" alt={post.title} />
                </div>
              )}
              <div className={styles.cardBody}>
                <span className={BADGE_CLASS[post.type]}>{BADGE_LABEL[post.type]}</span>
                {post.status && (
                  <span className={`badge ${post.status === 'OPEN' ? 'badge-status-open' : 'badge-status-done'}`}>
                    {STATUS_LABEL[post.type][post.status]}
                  </span>
                )}
                {post.pets && post.pets.length > 1 && (
                  <span className={styles.petCountChip}>{post.pets.length} bé</span>
                )}
                <h3 className={styles.cardTitle}>{post.title}</h3>
                <p className={styles.cardDesc}>{post.description}</p>
                {post.address && (
                  <p className={styles.cardDesc}>
                    <MapPin size={14} style={{ verticalAlign: -2 }} /> {post.address}
                  </p>
                )}
                {post.price != null && (
                  <p className={styles.cardDesc}>
                    <Wallet size={14} style={{ verticalAlign: -2 }} /> {post.price.toLocaleString('vi-VN')}đ
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
