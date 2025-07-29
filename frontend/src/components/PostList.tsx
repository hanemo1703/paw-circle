import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin, Search, Wallet } from 'lucide-react';
import { api, toAssetUrl } from '../lib/api';
import { formatRelativeTime } from '../lib/format';
import MultiSelectDropdown from './MultiSelectDropdown';
import styles from './PostList.module.scss';

// Leaflet touches `window` at import time, so it can't be rendered during SSR
// (same pattern as LocationPicker/PostLocationMap).
const PostsMapView = dynamic(() => import('./PostsMapView'), { ssr: false });

// Same source used by the "new post" location picker for Tỉnh/Thành phố options.
const PROVINCES_API_URL = 'https://provinces.open-api.vn/api/v2/p/';
const PAGE_SIZE = 6;
// Map view plots every matching post, not just the current page — capped at the
// backend's hard limit (500) so it stays a bounded query.
const MAP_VIEW_LIMIT = 500;
const SEARCH_DEBOUNCE_MS = 300;

export interface PostItem {
  id: string;
  title: string;
  description: string;
  type: 'LOST' | 'ADOPTION' | 'SUPPLY' | 'TRADE';
  status?: 'OPEN' | 'RESOLVED' | 'CLOSED';
  price?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  species?: string;
  provinceCode?: number;
  images?: string[];
  pets?: unknown[];
  createdAt: string;
}

interface PostsResponse {
  data: PostItem[];
  total: number;
}

const SPECIES_FILTER_OPTIONS = [
  { value: 'Chó', label: 'Chó' },
  { value: 'Mèo', label: 'Mèo' },
  { value: 'OTHER', label: 'Khác' },
];

// Compact page-number list with ellipsis for large result sets, e.g. [1, 2, '...', 5, 6, 7, '...', 12].
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = Array.from(keep)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | '...')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
}

export const BADGE_CLASS: Record<PostItem['type'], string> = {
  LOST: 'badge badge-lost',
  ADOPTION: 'badge badge-adoption',
  SUPPLY: 'badge badge-supply',
  TRADE: 'badge badge-trade',
};

export const BADGE_LABEL: Record<PostItem['type'], string> = {
  LOST: 'Bị lạc',
  ADOPTION: 'Cần người nuôi',
  SUPPLY: 'Đồ dùng',
  TRADE: 'Mua bán boss',
};

const STATUS_LABEL: Record<PostItem['type'], Record<'OPEN' | 'RESOLVED' | 'CLOSED', string>> = {
  LOST: { OPEN: 'Đang tìm', RESOLVED: 'Đã tìm thấy', CLOSED: 'Đã đóng tin' },
  ADOPTION: { OPEN: 'Còn bé chờ nhận nuôi', RESOLVED: 'Đã có chủ mới', CLOSED: 'Đã đóng tin' },
  SUPPLY: { OPEN: 'Còn đồ', RESOLVED: 'Đã cho xong', CLOSED: 'Đã đóng tin' },
  TRADE: { OPEN: 'Còn hàng', RESOLVED: 'Đã bán', CLOSED: 'Đã đóng tin' },
};

const STATUS_VALUES = ['OPEN', 'RESOLVED', 'CLOSED'] as const;
const ALL_TYPES = Object.keys(STATUS_LABEL) as PostItem['type'][];

interface StatusOption {
  value: string;
  label: string;
  status: (typeof STATUS_VALUES)[number];
}

// Builds one chip per distinct wording used by the given types, so a mixed
// page like "Bài post của tôi" (all types) shows e.g. "Đang tìm" and "Còn hàng" as separate,
// independently selectable chips instead of one joined chip. Types that share identical
// wording for a status (e.g. every type's CLOSED says "Đã đóng tin") collapse into a single
// chip whose value covers all of them. Driven by the fixed `type`/`authorId` prop rather than
// fetched posts, so the chip set stays stable as the (now server-paginated) results change.
function buildStatusOptions(types: PostItem['type'][]): StatusOption[] {
  return STATUS_VALUES.flatMap((status) => {
    const combosByLabel = new Map<string, string[]>();
    for (const type of types) {
      const label = STATUS_LABEL[type][status];
      const combo = `${type}:${status}`;
      const combos = combosByLabel.get(label);
      if (combos) combos.push(combo);
      else combosByLabel.set(label, [combo]);
    }
    return Array.from(combosByLabel.entries()).map(([label, combos]) => ({
      value: combos.join(','),
      label,
      status,
    }));
  });
}

function FilterChipGroup({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }
  return (
    <div className={styles.filterGroup}>
      <div className={styles.filterGroupTitle}>{title}</div>
      <div className={styles.chipList}>
        {options.map((opt) => (
          <label key={opt.value} className={styles.chip}>
            <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function buildQuery(params: {
  type?: PostItem['type'];
  authorId?: string;
  statusFilter: string[];
  speciesFilter: string[];
  areaFilter: string[];
  search: string;
  page: number;
  limit: number;
}): string {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.authorId) qs.set('authorId', params.authorId);
  if (params.statusFilter.length > 0) qs.set('statusCombos', params.statusFilter.join(','));
  if (params.speciesFilter.length > 0) qs.set('species', params.speciesFilter.join(','));
  if (params.areaFilter.length > 0) qs.set('provinceCodes', params.areaFilter.join(','));
  if (params.search) qs.set('search', params.search);
  qs.set('page', String(params.page));
  qs.set('limit', String(params.limit));
  return qs.toString();
}

export default function PostList({
  title,
  emptyText,
  newPostType,
  type,
  authorId,
  initialPosts,
  initialTotal,
}: {
  title: string;
  emptyText: string;
  newPostType: PostItem['type'];
  // Fixed post type for the listing pages (lost-found/adoption/marketplace/trade).
  type?: PostItem['type'];
  // Used instead of `type` for "Bài post của tôi", which spans every type for one author.
  authorId?: string;
  // Server-fetched first page (default filters: status OPEN, page 1) so the page has
  // content on first paint instead of flashing empty before the client fetch resolves.
  initialPosts?: PostItem[];
  initialTotal?: number;
}) {
  const typesForChips = useMemo(() => (type ? [type] : ALL_TYPES), [type]);

  const [statusFilter, setStatusFilter] = useState<string[]>(() =>
    buildStatusOptions(typesForChips)
      .filter((opt) => opt.status === 'OPEN')
      .map((opt) => opt.value),
  );
  const [speciesFilter, setSpeciesFilter] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [areaOptions, setAreaOptions] = useState<{ value: string; label: string }[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [page, setPage] = useState(1);

  const [posts, setPosts] = useState<PostItem[]>(initialPosts ?? []);
  const [total, setTotal] = useState(initialTotal ?? 0);
  const [mapPosts, setMapPosts] = useState<PostItem[]>([]);
  // Whether this type/author has ANY post at all, ignoring filters — distinguishes
  // "nothing posted yet" (emptyText) from "no results for the current filter".
  const [overallTotal, setOverallTotal] = useState<number | null>(null);

  const statusOptions = useMemo(() => buildStatusOptions(typesForChips), [typesForChips]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetch(PROVINCES_API_URL)
      .then((res) => res.json())
      .then((data: { code: number; name: string }[]) => {
        const options = data
          .map((p) => ({ value: String(p.code), label: p.name }))
          .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
        setAreaOptions(options);
      })
      .catch(() => {
        // Provinces API unreachable — Khu vực filter just stays empty
      });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, speciesFilter, areaFilter, search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const qs = buildQuery({ type, authorId, statusFilter, speciesFilter, areaFilter, search, page, limit: PAGE_SIZE });
        const res: PostsResponse = await api.get(`/posts?${qs}`);
        if (!cancelled) {
          setPosts(res.data);
          setTotal(res.total);
        }
      } catch {
        // Transient fetch failure — keep showing the previous page
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [type, authorId, statusFilter, speciesFilter, areaFilter, search, page]);

  useEffect(() => {
    if (view !== 'map') return;
    let cancelled = false;
    async function loadMap() {
      try {
        const qs = buildQuery({
          type,
          authorId,
          statusFilter,
          speciesFilter,
          areaFilter,
          search,
          page: 1,
          limit: MAP_VIEW_LIMIT,
        });
        const res: PostsResponse = await api.get(`/posts?${qs}`);
        if (!cancelled) setMapPosts(res.data);
      } catch {
        // Transient fetch failure — map just keeps showing its previous pins
      }
    }
    loadMap();
    return () => {
      cancelled = true;
    };
  }, [view, type, authorId, statusFilter, speciesFilter, areaFilter, search]);

  useEffect(() => {
    let cancelled = false;
    async function loadOverallTotal() {
      try {
        const qs = buildQuery({
          type,
          authorId,
          statusFilter: [],
          speciesFilter: [],
          areaFilter: [],
          search: '',
          page: 1,
          limit: 1,
        });
        const res: PostsResponse = await api.get(`/posts?${qs}`);
        if (!cancelled) setOverallTotal(res.total);
      } catch {
        // Transient fetch failure — fall back to treating this as "has posts" so
        // the filter sidebar doesn't disappear on a flaky request.
        if (!cancelled) setOverallTotal(1);
      }
    }
    loadOverallTotal();
    return () => {
      cancelled = true;
    };
  }, [type, authorId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const hasActiveFilters =
    statusFilter.length > 0 ||
    speciesFilter.length > 0 ||
    areaFilter.length > 0 ||
    searchInput.trim().length > 0;

  function clearFilters() {
    setStatusFilter([]);
    setSpeciesFilter([]);
    setAreaFilter([]);
    setSearchInput('');
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <Link href={`/posts/new?type=${newPostType}`} className="btn btn-primary">
          + Đăng tin mới
        </Link>
      </div>

      {overallTotal === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <FilterChipGroup
              title="Trạng thái"
              options={statusOptions}
              selected={statusFilter}
              onChange={setStatusFilter}
            />
            <FilterChipGroup
              title="Loài"
              options={SPECIES_FILTER_OPTIONS}
              selected={speciesFilter}
              onChange={setSpeciesFilter}
            />
            <div className={styles.filterGroup}>
              <div className={styles.filterGroupTitle}>Khu vực</div>
              <MultiSelectDropdown
                label=""
                options={areaOptions}
                selected={areaFilter}
                onChange={setAreaFilter}
              />
            </div>
            {hasActiveFilters && (
              <button type="button" className={styles.clearFilters} onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            )}
          </aside>

          <div className={styles.main}>
            <div className={styles.toolbar}>
              <div className={styles.searchWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Tìm theo tên, khu vực..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setView('list')}
              >
                Danh sách
              </button>
              <button
                type="button"
                className={`btn ${view === 'map' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setView('map')}
              >
                Bản đồ
              </button>
            </div>

            {view === 'map' ? (
              <PostsMapView posts={mapPosts} />
            ) : total === 0 ? (
              <p className={styles.empty}>Không tìm thấy tin phù hợp với bộ lọc đã chọn.</p>
            ) : (
              <>
                <div className={styles.listRows}>
                  {posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      className={`${styles.postRow} ${post.status && post.status !== 'OPEN' ? styles.postRowDimmed : ''}`}
                    >
                      {post.images && post.images.length > 0 ? (
                        <img className={styles.thumb} src={toAssetUrl(post.images[0])} alt={post.title} />
                      ) : (
                        <img className={styles.thumb} src="/logo.jpg" alt={post.title} />
                      )}
                      <div className={styles.rowBody}>
                        <div className={styles.rowTop}>
                          <h3 className={styles.rowTitle}>{post.title}</h3>
                          <span className={BADGE_CLASS[post.type]}>{BADGE_LABEL[post.type]}</span>
                        </div>
                        <div className={styles.rowMeta}>
                          {formatRelativeTime(post.createdAt)}
                          {post.address && (
                            <>
                              {' · '}
                              <MapPin size={12} style={{ verticalAlign: -1 }} /> {post.address}
                            </>
                          )}
                          {post.pets && post.pets.length > 1 && (
                            <span className={styles.petCountChip}>{post.pets.length} bé</span>
                          )}
                        </div>
                        <p className={styles.rowExcerpt}>{post.description}</p>
                        {post.price != null && (
                          <p className={styles.rowPrice}>
                            <Wallet size={14} style={{ verticalAlign: -2 }} /> {post.price.toLocaleString('vi-VN')}đ
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                      aria-label="Trang trước"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {getPageNumbers(currentPage, totalPages).map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={currentPage === totalPages}
                      onClick={() => setPage(currentPage + 1)}
                      aria-label="Trang sau"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
