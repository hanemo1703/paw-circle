import { useEffect, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CheckCircle2, ChevronLeft, ChevronRight, MessageCircle, Pencil, Phone, Plus, Share2, X, XCircle } from 'lucide-react';
import { api, toAssetUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatRelativeTime } from '../../../lib/format';
import { useToast } from '../../../lib/useToast';
import { useConfirmDialog } from '../../../lib/useConfirmDialog';
import ConfirmDialog from '../../../components/ConfirmDialog';
import styles from './index.module.scss';

type CampaignStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type PosterType = 'INDIVIDUAL' | 'ORGANIZATION';

interface Donor {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface DonationItem {
  id: string;
  message?: string;
  anonymous: boolean;
  donor?: Donor;
  createdAt: string;
}

interface Creator {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Campaign {
  id: string;
  posterType: PosterType;
  organizationLink?: string;
  title: string;
  description: string;
  images: string[];
  targetAmount?: number;
  currentAmount: number;
  deadline?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  qrImageUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  pickupAddress?: string;
  status: CampaignStatus;
  creatorId: string;
  creator?: Creator;
  creatorCampaignCount?: number;
  createdAt: string;
}

const DONATIONS_PAGE_SIZE = 15;

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

const STATUS_LABEL: Record<CampaignStatus, string> = {
  ACTIVE: 'Đang gây quỹ',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã đóng',
};

const STATUS_BADGE_CLASS: Record<CampaignStatus, string> = {
  ACTIVE: 'badge-campaign-active',
  COMPLETED: 'badge-campaign-completed',
  CANCELLED: 'badge-campaign-cancelled',
};

type StatusAction = 'COMPLETED' | 'CANCELLED';

const STATUS_ACTION_COPY: Record<StatusAction, { button: string; title: string; message: string; confirmText: string; danger: boolean }> = {
  COMPLETED: {
    button: 'Đánh dấu hoàn thành',
    title: 'Đánh dấu chiến dịch đã hoàn thành?',
    message: 'Chiến dịch sẽ ngừng nhận ủng hộ và hiển thị trạng thái "Đã hoàn thành".',
    confirmText: 'Đánh dấu hoàn thành',
    danger: false,
  },
  CANCELLED: {
    button: 'Đóng chiến dịch',
    title: 'Đóng chiến dịch này?',
    message: 'Chiến dịch sẽ ngừng nhận ủng hộ và hiển thị trạng thái "Đã đóng". Bạn vẫn có thể mở lại sau trong trang chỉnh sửa.',
    confirmText: 'Đóng chiến dịch',
    danger: true,
  },
};

const POSTER_TYPE_LABEL: Record<PosterType, string> = {
  INDIVIDUAL: 'cá nhân',
  ORGANIZATION: 'tổ chức',
};

function remainingDaysLabel(deadline?: string): string | null {
  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return 'đã hết hạn';
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return `còn ${days} ngày`;
}

interface Props {
  campaign: Campaign | null;
  initialDonations: DonationItem[];
  initialDonationsTotal: number;
}

export default function CampaignDetailPage({
  campaign: initialCampaign,
  initialDonations,
  initialDonationsTotal,
}: Props) {
  const router = useRouter();
  const { user, isAuthenticated, accessToken } = useAuth();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [donations, setDonations] = useState(initialDonations);
  const [donationsTotal, setDonationsTotal] = useState(initialDonationsTotal);
  const [donationsPage, setDonationsPage] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const [donateMessage, setDonateMessage] = useState('');
  const [donateAnonymous, setDonateAnonymous] = useState(false);
  const [proofImageFile, setProofImageFile] = useState<File | null>(null);
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const [donating, setDonating] = useState(false);
  const [donateError, setDonateError] = useState<string | null>(null);
  const { showToast, toastNode } = useToast();
  const statusDialog = useConfirmDialog<StatusAction>();
  const proofFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!campaign) return;
    let cancelled = false;
    async function loadDonations() {
      try {
        const res: { data: DonationItem[]; total: number } = await api.get(
          `/donations/campaigns/${campaign!.id}/donations?page=${donationsPage}&limit=${DONATIONS_PAGE_SIZE}`,
        );
        if (!cancelled) {
          setDonations(res.data);
          setDonationsTotal(res.total);
        }
      } catch {
        // Transient fetch failure — keep showing the previous page
      }
    }
    loadDonations();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id, donationsPage]);

  if (!campaign) {
    return (
      <div className={`container ${styles.wrapper}`}>
        <p className={styles.notFound}>Không tìm thấy chiến dịch.</p>
      </div>
    );
  }

  const images = campaign.images ?? [];
  const isOwner = !!user && user.id === campaign.creatorId;
  const remaining = remainingDaysLabel(campaign.deadline);
  const qrUrl = toAssetUrl(campaign.qrImageUrl);
  const donationsTotalPages = Math.max(1, Math.ceil(donationsTotal / DONATIONS_PAGE_SIZE));
  const donationsCurrentPage = Math.min(donationsPage, donationsTotalPages);

  const openDonate = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setDonateError(null);
    setDonateAmount('');
    setDonateMessage('');
    setDonateAnonymous(false);
    if (proofImagePreview) URL.revokeObjectURL(proofImagePreview);
    setProofImageFile(null);
    setProofImagePreview(null);
    setDonateOpen(true);
  };

  const handleProofFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setDonateError('Ảnh chuyển khoản không hợp lệ hoặc vượt quá 5MB.');
      return;
    }
    if (proofImagePreview) URL.revokeObjectURL(proofImagePreview);
    setProofImageFile(file);
    setProofImagePreview(URL.createObjectURL(file));
    setDonateError(null);
  };

  const removeProofImage = () => {
    if (proofImagePreview) URL.revokeObjectURL(proofImagePreview);
    setProofImageFile(null);
    setProofImagePreview(null);
  };

  const submitDonate = async () => {
    const amount = Number(donateAmount);
    if (!amount || amount < 1000) {
      setDonateError('Vui lòng nhập số tiền hợp lệ (tối thiểu 1.000đ).');
      return;
    }
    if (!proofImageFile) {
      setDonateError('Vui lòng đính kèm ảnh chuyển khoản.');
      return;
    }
    setDonating(true);
    setDonateError(null);
    try {
      const formData = new FormData();
      formData.append('images', proofImageFile);
      const uploadRes = await api.postForm('/donations/campaigns/upload-images', formData, accessToken || undefined);
      const proofImageUrl = uploadRes.urls[0];

      const donation = await api.post(
        `/donations/campaigns/${campaign.id}/donate`,
        { amount, message: donateMessage.trim() || undefined, anonymous: donateAnonymous, proofImageUrl },
        accessToken || undefined,
      );
      setCampaign((prev) => (prev ? { ...prev, currentAmount: Number(prev.currentAmount) + amount } : prev));
      setDonationsTotal((prev) => prev + 1);
      if (donationsPage === 1) {
        setDonations((prev) => [
          {
            ...donation,
            donor: donateAnonymous ? undefined : user ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl } : undefined,
          },
          ...prev,
        ]);
      }
      if (proofImagePreview) URL.revokeObjectURL(proofImagePreview);
      setProofImageFile(null);
      setProofImagePreview(null);
      setDonateOpen(false);
      showToast('Cảm ơn bạn đã ủng hộ chiến dịch!');
    } catch (err: any) {
      setDonateError(err.message || 'Ghi nhận ủng hộ thất bại.');
    } finally {
      setDonating(false);
    }
  };

  const confirmStatusChange = async () => {
    const statusAction = statusDialog.pending;
    if (!statusAction) return;
    statusDialog.setSubmitting(true);
    try {
      const updated = await api.patch(
        `/donations/campaigns/${campaign.id}`,
        { status: statusAction },
        accessToken || undefined,
      );
      setCampaign((prev) => (prev ? { ...prev, status: updated.status } : prev));
      showToast(statusAction === 'COMPLETED' ? 'Đã đánh dấu chiến dịch hoàn thành.' : 'Đã đóng chiến dịch.');
      statusDialog.close();
    } catch (err: any) {
      showToast(err.message || 'Cập nhật trạng thái thất bại.', 'error');
      statusDialog.setSubmitting(false);
    }
  };

  const handleMessageCreator = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.push(`/messages/${campaign.creatorId}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: campaign.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast('Đã sao chép liên kết chiến dịch!');
    } catch {
      // User cancelled the share sheet or clipboard write failed — no-op
    }
  };

  return (
    <div className={`container ${styles.wrapper}`}>
      {toastNode}

      {statusDialog.pending && (
        <ConfirmDialog
          title={STATUS_ACTION_COPY[statusDialog.pending].title}
          message={STATUS_ACTION_COPY[statusDialog.pending].message}
          confirmText={STATUS_ACTION_COPY[statusDialog.pending].confirmText}
          danger={STATUS_ACTION_COPY[statusDialog.pending].danger}
          confirming={statusDialog.submitting}
          onConfirm={confirmStatusChange}
          onCancel={() => !statusDialog.submitting && statusDialog.close()}
        />
      )}

      {donateOpen && (
        <div className={styles.overlay} onClick={() => !donating && setDonateOpen(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>Xác nhận đã chuyển khoản</h3>
            <div className={styles.dialogField}>
              <label htmlFor="donateAmount">
                Số tiền đã chuyển (đ)<span style={{ color: '#ff5b2e' }}> *</span>
              </label>
              <input
                id="donateAmount"
                type="number"
                min={1000}
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                placeholder="VD: 100000"
              />
            </div>
            <div className={styles.dialogField}>
              <label htmlFor="donateMessage">Lời nhắn (không bắt buộc)</label>
              <textarea
                id="donateMessage"
                rows={3}
                value={donateMessage}
                onChange={(e) => setDonateMessage(e.target.value)}
                placeholder="Gửi lời động viên đến người đăng..."
              />
            </div>
            <div className={styles.proofImageField}>
              <label htmlFor="proofImage">
                Ảnh chuyển khoản<span style={{ color: '#ff5b2e' }}> *</span>
              </label>
              <input
                id="proofImage"
                ref={proofFileInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenFileInput}
                disabled={donating}
                onChange={handleProofFileSelected}
              />
              {proofImagePreview ? (
                <div className={styles.proofImageTile}>
                  <img src={proofImagePreview} alt="Ảnh chuyển khoản" />
                  <button
                    type="button"
                    className={styles.proofImageRemoveBtn}
                    onClick={removeProofImage}
                    aria-label="Xóa ảnh"
                    disabled={donating}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.proofImageAddBtn}
                  onClick={() => proofFileInputRef.current?.click()}
                  disabled={donating}
                >
                  <Plus size={20} />
                  Thêm ảnh
                </button>
              )}
            </div>
            <label className={styles.dialogCheckbox}>
              <input
                type="checkbox"
                checked={donateAnonymous}
                onChange={(e) => setDonateAnonymous(e.target.checked)}
              />
              Ủng hộ ẩn danh
            </label>
            {donateError && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{donateError}</p>}
            <div className={styles.dialogActions}>
              <button type="button" className="btn btn-outline" onClick={() => setDonateOpen(false)} disabled={donating}>
                Hủy
              </button>
              <button type="button" className="btn btn-primary" onClick={submitDonate} disabled={donating}>
                {donating ? 'Đang gửi...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.backRow}>
        <Link href="/donations" className={styles.backLink}>
          ‹ Quay lại danh sách chiến dịch
        </Link>
      </div>

      <div className={styles.layout}>
        <div className={styles.content}>
          <div className={styles.mainImageWrapper}>
            <img
              className={styles.mainImage}
              src={images.length > 0 ? toAssetUrl(images[activeImage]) : '/logo.jpg'}
              alt={campaign.title}
            />
          </div>
          {images.length > 1 && (
            <div className={styles.thumbRow}>
              {images.map((img, idx) => (
                <img
                  key={img}
                  src={toAssetUrl(img)}
                  alt={`Ảnh ${idx + 1}`}
                  className={`${styles.thumb} ${idx === activeImage ? styles.thumbActive : ''}`}
                  onClick={() => setActiveImage(idx)}
                />
              ))}
            </div>
          )}

          <div className={styles.header}>
            <div className={styles.badgeRow}>
              <span className={`badge ${STATUS_BADGE_CLASS[campaign.status]}`}>{STATUS_LABEL[campaign.status]}</span>
            </div>
            <h1 className={styles.title}>{campaign.title}</h1>
            <p className={styles.meta}>
              Đăng bởi {campaign.creator?.name ?? 'Ẩn danh'} ({POSTER_TYPE_LABEL[campaign.posterType]})
              {remaining && ` · ${remaining}`}
            </p>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Mô tả chiến dịch</h3>
            <p className={styles.description}>{campaign.description}</p>
          </div>

          {donations.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Người đã ủng hộ</h3>
              <div className={styles.donorCard}>
                {donations.map((d) => (
                  <div key={d.id} className={styles.donorRow}>
                    <img className={styles.donorAvatar} src={toAssetUrl(d.donor?.avatarUrl) || '/logo.jpg'} alt="" />
                    <div className={styles.donorName}>
                      {d.anonymous || !d.donor ? 'Người ủng hộ ẩn danh' : d.donor.name}{' '}
                      <span className={styles.donorTime}>· {formatRelativeTime(d.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {donationsTotalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={donationsCurrentPage === 1}
                    onClick={() => setDonationsPage(donationsCurrentPage - 1)}
                    aria-label="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {getPageNumbers(donationsCurrentPage, donationsTotalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`${styles.pageBtn} ${p === donationsCurrentPage ? styles.pageBtnActive : ''}`}
                        onClick={() => setDonationsPage(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={donationsCurrentPage === donationsTotalPages}
                    onClick={() => setDonationsPage(donationsCurrentPage + 1)}
                    aria-label="Trang sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <div>
              <p className={styles.donorCountTitle}>{donationsTotal} người đã ủng hộ</p>
              <p className={styles.privacyNote}>
                Số tiền ủng hộ không được công khai để bảo vệ quyền riêng tư của người đóng góp.
              </p>
            </div>

            {(campaign.bankName || campaign.bankAccountNumber || qrUrl) && (
              <div>
                <div className={styles.bankLabel}>Ủng hộ qua chuyển khoản</div>
                <div className={styles.bankBox}>
                  {qrUrl && <img className={styles.qrImage} src={qrUrl} alt="QR chuyển khoản" />}
                  {(campaign.bankName || campaign.bankAccountNumber || campaign.bankAccountHolder) && (
                    <div className={styles.bankInfo}>
                      {campaign.bankName && (
                        <div>
                          <span>Ngân hàng:</span> {campaign.bankName}
                        </div>
                      )}
                      {campaign.bankAccountNumber && (
                        <div>
                          <span>Số TK:</span> {campaign.bankAccountNumber}
                        </div>
                      )}
                      {campaign.bankAccountHolder && (
                        <div>
                          <span>Chủ TK:</span> {campaign.bankAccountHolder}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {campaign.status === 'ACTIVE' && (
              <button type="button" className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={openDonate}>
                Tôi đã chuyển khoản
              </button>
            )}

            {(campaign.contactPhone || campaign.contactEmail || campaign.pickupAddress) && (
              <div className={styles.contactHint}>
                Chưa yên tâm chuyển khoản?{' '}
                <button type="button" onClick={() => setShowContact((v) => !v)}>
                  Liên hệ trực tiếp với người đăng
                </button>{' '}
                để trao đổi và giúp đỡ theo cách khác.
                {showContact && (
                  <p style={{ marginTop: 8 }}>
                    {campaign.contactPhone && (
                      <>
                        <Phone size={14} style={{ verticalAlign: -2 }} /> {campaign.contactPhone}
                      </>
                    )}
                    {campaign.contactEmail && <> · {campaign.contactEmail}</>}
                    {campaign.pickupAddress && (
                      <>
                        <br />
                        Địa chỉ nhận đồ: {campaign.pickupAddress}
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {campaign.creator && (
            <div className={styles.card}>
              <div className={styles.posterCard}>
                <img
                  className={styles.posterAvatar}
                  src={toAssetUrl(campaign.creator.avatarUrl) || '/logo.jpg'}
                  alt={campaign.creator.name}
                />
                <div>
                  <p className={styles.posterName}>{campaign.creator.name}</p>
                  <p className={styles.posterMeta}>{campaign.creatorCampaignCount ?? 1} chiến dịch đã thực hiện</p>
                </div>
              </div>
              {!isOwner && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ justifyContent: 'center' }}
                  onClick={handleMessageCreator}
                >
                  <MessageCircle size={16} /> Nhắn tin cho người đăng
                </button>
              )}
            </div>
          )}

          {isOwner && (
            <div className={styles.card}>
              <p className={styles.ownerCardTitle}>Chủ chiến dịch</p>
              <Link href={`/donations/${campaign.id}/edit`} className={styles.sidebarLink}>
                <Pencil size={16} /> Chỉnh sửa chiến dịch
              </Link>
              {campaign.status === 'ACTIVE' && (
                <>
                  <button
                    type="button"
                    className={styles.sidebarLink}
                    style={{ border: 'none', color: 'inherit' }}
                    onClick={() => statusDialog.open('COMPLETED')}
                  >
                    <CheckCircle2 size={16} /> Đánh dấu hoàn thành
                  </button>
                  <button
                    type="button"
                    className={styles.sidebarLink}
                    style={{ border: 'none', color: 'inherit' }}
                    onClick={() => statusDialog.open('CANCELLED')}
                  >
                    <XCircle size={16} /> Đóng chiến dịch
                  </button>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            className={styles.sidebarLink}
            style={{ border: 'none', color: 'inherit' }}
            onClick={handleShare}
          >
            <Share2 size={14} /> Chia sẻ
          </button>

          <div className={styles.disclaimer}>
            ⚠ PetConnect không xác minh và không chịu trách nhiệm về tính xác thực của chiến dịch này. Vui lòng tự
            cân nhắc trước khi ủng hộ.
          </div>
        </aside>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = ctx.params?.id as string;
  try {
    const [campaign, donations] = await Promise.all([
      api.get(`/donations/campaigns/${id}`),
      api.get(`/donations/campaigns/${id}/donations?page=1&limit=${DONATIONS_PAGE_SIZE}`),
    ]);
    return { props: { campaign, initialDonations: donations.data, initialDonationsTotal: donations.total } };
  } catch {
    return { props: { campaign: null, initialDonations: [], initialDonationsTotal: 0 } };
  }
};
