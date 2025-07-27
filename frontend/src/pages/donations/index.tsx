import { useEffect, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { api, toAssetUrl } from '../../lib/api';
import Dropdown from '../../components/Dropdown';
import styles from './index.module.scss';

const PAGE_SIZE = 6;
const SEARCH_DEBOUNCE_MS = 300;

type CampaignStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type CampaignCategory = 'FOOD_SUPPLIES' | 'MEDICAL' | 'OTHER';
type SortOption = 'newest' | 'deadline' | 'progress';

interface Campaign {
  id: string;
  title: string;
  description: string;
  images: string[];
  targetAmount?: number;
  currentAmount: number;
  deadline?: string;
  status: CampaignStatus;
  category: CampaignCategory;
  categoryOther?: string;
  createdAt: string;
}

const STATUS_LABEL: Record<CampaignStatus, string> = {
  ACTIVE: 'Đang gây quỹ',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã đóng',
};

const STATUS_VALUES: CampaignStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED'];

const STATUS_BADGE_CLASS: Record<CampaignStatus, string> = {
  ACTIVE: 'badge-campaign-active',
  COMPLETED: 'badge-campaign-completed',
  CANCELLED: 'badge-campaign-cancelled',
};

const CATEGORY_LABEL: Record<CampaignCategory, string> = {
  FOOD_SUPPLIES: 'Thức ăn - Cát mèo',
  MEDICAL: 'Y tế - chữa bệnh',
  OTHER: 'Khác',
};

const CATEGORY_VALUES: CampaignCategory[] = ['FOOD_SUPPLIES', 'MEDICAL', 'OTHER'];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'deadline', label: 'Sắp hết hạn' },
  { value: 'progress', label: 'Gần đạt mục tiêu' },
];

function remainingDaysLabel(deadline?: string): string | null {
  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return 'Đã hết hạn';
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return `Còn ${days} ngày`;
}

function progressPercent(c: Campaign): number | null {
  if (c.targetAmount == null) return null;
  return Math.min(100, Math.round((c.currentAmount / c.targetAmount) * 100));
}

function sortCampaigns(list: Campaign[], sortBy: SortOption): Campaign[] {
  const sorted = [...list];
  if (sortBy === 'deadline') {
    sorted.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
    return sorted;
  }
  if (sortBy === 'progress') {
    sorted.sort((a, b) => {
      const pa = progressPercent(a);
      const pb = progressPercent(b);
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return pb - pa;
    });
    return sorted;
  }
  sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return sorted;
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

interface Props {
  campaigns: Campaign[];
}

export default function DonationsPage({ campaigns }: Props) {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus[]>(['ACTIVE']);
  const [categoryFilter, setCategoryFilter] = useState<CampaignCategory[]>([...CATEGORY_VALUES]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function toggleStatus(status: CampaignStatus) {
    setStatusFilter((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  }

  function toggleCategory(category: CampaignCategory) {
    setCategoryFilter((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  }

  const filteredCampaigns = useMemo(() => {
    const filtered = campaigns.filter((c) => {
      if (statusFilter.length > 0 && !statusFilter.includes(c.status)) return false;
      if (categoryFilter.length > 0 && !categoryFilter.includes(c.category)) return false;
      if (search && !`${c.title} ${c.description}`.toLowerCase().includes(search)) return false;
      return true;
    });
    return sortCampaigns(filtered, sortBy);
  }, [campaigns, statusFilter, categoryFilter, search, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCampaigns = filteredCampaigns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className={`container ${styles.wrapper}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tất cả các chiến dịch</h1>
          <p className={styles.subtitle}>Cùng chung tay giúp đỡ những bé thú cần được cứu trợ</p>
        </div>
        <Link href="/donations/new" className="btn btn-primary">
          + Tạo chiến dịch
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <p className={styles.empty}>
          Chưa có chiến dịch nào đang gây quỹ. Cá nhân hoặc tổ chức cứu hộ có
          thể tạo chiến dịch đầu tiên.
        </p>
      ) : (
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarSection}>
              <div className={styles.sidebarTitle}>Trạng thái</div>
              <div className={styles.sidebarGroup}>
                {STATUS_VALUES.map((status) => (
                  <label key={status} className={styles.chip}>
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(status)}
                      onChange={() => toggleStatus(status)}
                    />
                    {STATUS_LABEL[status]}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.sidebarSection}>
              <div className={styles.sidebarTitle}>Loại chiến dịch</div>
              <div className={styles.sidebarGroup}>
                {CATEGORY_VALUES.map((category) => (
                  <label key={category} className={styles.chip}>
                    <input
                      type="checkbox"
                      checked={categoryFilter.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    {CATEGORY_LABEL[category]}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.sidebarSection}>
              <div className={styles.sidebarTitle}>Sắp xếp theo</div>
              <Dropdown
                value={sortBy}
                onChange={(v) => setSortBy(v as SortOption)}
                options={SORT_OPTIONS}
              />
            </div>
          </aside>

          <div className={styles.content}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Tìm chiến dịch theo tên, khu vực..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {filteredCampaigns.length === 0 ? (
              <p className={styles.empty}>Không tìm thấy chiến dịch phù hợp với bộ lọc đã chọn.</p>
            ) : (
              <>
                <div className={styles.grid}>
                  {pagedCampaigns.map((c) => {
                    const percent = progressPercent(c);
                    const remaining = remainingDaysLabel(c.deadline);
                    return (
                      <Link key={c.id} href={`/donations/${c.id}`} className={styles.card}>
                        <img
                          className={styles.cardImage}
                          src={c.images?.length > 0 ? toAssetUrl(c.images[0]) : '/logo.jpg'}
                          alt={c.title}
                        />
                        <div className={styles.cardBody}>
                          <div className={styles.badgeRow}>
                            <span className={`badge ${STATUS_BADGE_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                            {remaining && <span className={styles.remaining}>{remaining}</span>}
                          </div>
                          <h3>{c.title}</h3>
                          <p>{c.description}</p>
                          {percent != null && (
                            <>
                              <div className={styles.progressTrack}>
                                <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                              </div>
                              <div className={styles.meta}>
                                <span>{c.currentAmount.toLocaleString('vi-VN')}đ đã quyên góp</span>
                                <span>Mục tiêu: {c.targetAmount!.toLocaleString('vi-VN')}đ</span>
                              </div>
                            </>
                          )}
                          <span
                            className="btn btn-primary"
                            style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
                          >
                            Xem chiến dịch
                          </span>
                        </div>
                      </Link>
                    );
                  })}
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

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  let campaigns: Campaign[] = [];
  try {
    campaigns = await api.get('/donations/campaigns');
  } catch {
    // Backend not running — still render the page with an empty list
  }

  return { props: { campaigns } };
};
