import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Map, MapPin, Search, Wallet } from 'lucide-react';
import { toAssetUrl } from '../lib/api';
import { formatRelativeTime } from '../lib/format';
import MultiSelectDropdown from './MultiSelectDropdown';
import styles from './PostList.module.scss';

// Same source used by the "new post" location picker for Tỉnh/Thành phố options.
const PROVINCES_API_URL = 'https://provinces.open-api.vn/api/v2/p/';
const PAGE_SIZE = 6;
const SEARCH_DEBOUNCE_MS = 300;

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
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>(['OPEN']);
  const [speciesFilter, setSpeciesFilter] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [areaOptions, setAreaOptions] = useState<{ value: string; label: string }[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [page, setPage] = useState(1);

  const typeOptions = useMemo(
    () =>
      Array.from(new Set(posts.map((p) => p.type))).map((t) => ({ value: t, label: BADGE_LABEL[t] })),
    [posts],
  );
  const statusOptions = useMemo(() => buildStatusOptions(posts), [posts]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
        if (typeFilter.length > 0 && !typeFilter.includes(post.type)) {
          return false;
        }
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
        if (search && !`${post.title} ${post.address ?? ''}`.toLowerCase().includes(search)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, typeFilter, statusFilter, speciesFilter, areaFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, speciesFilter, areaFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedPosts = filteredPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilters =
    typeFilter.length > 0 ||
    statusFilter.length > 0 ||
    speciesFilter.length > 0 ||
    areaFilter.length > 0 ||
    searchInput.trim().length > 0;

  function clearFilters() {
    setTypeFilter([]);
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

      {posts.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            {typeOptions.length > 1 && (
              <FilterChipGroup
                title="Loại tin"
                options={typeOptions}
                selected={typeFilter}
                onChange={setTypeFilter}
              />
            )}
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
              <div className={styles.mapPlaceholder}>
                <Map size={36} strokeWidth={1.5} />
                <p>Chức năng xem trên bản đồ sắp ra mắt.</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <p className={styles.empty}>Không tìm thấy tin phù hợp với bộ lọc đã chọn.</p>
            ) : (
              <>
                <div className={styles.listRows}>
                  {pagedPosts.map((post) => (
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
