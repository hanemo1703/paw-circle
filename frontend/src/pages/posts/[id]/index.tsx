import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { MapPin, MessageCircle, Pencil, Phone, Share2, Trash2 } from 'lucide-react';
import { api, toAssetUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatRelativeTime } from '../../../lib/format';
import Toast, { ToastType } from '../../../components/Toast';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Dropdown from '../../../components/Dropdown';
import styles from './index.module.scss';

const PostLocationMap = dynamic(() => import('../../../components/PostLocationMap'), { ssr: false });

type PostType = 'LOST' | 'FOUND' | 'ADOPTION' | 'MARKETPLACE' | 'TRADE';
type PostStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';
type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';
type AdoptionPetStatus = 'PENDING' | 'ADOPTED';

interface AdoptionPetInfo {
  species: string;
  breed?: string;
  color?: string;
  age?: number;
  gender?: PetGender;
  size?: number;
  status?: AdoptionPetStatus;
}

interface Author {
  id: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
}

interface PostDetail {
  id: string;
  type: PostType;
  status: PostStatus;
  title: string;
  description: string;
  images: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  species?: string;
  breed?: string;
  color?: string;
  size?: number;
  gender?: PetGender;
  collarDescription?: string;
  pets?: AdoptionPetInfo[];
  author?: Author;
  createdAt: string;
}

const BADGE_CLASS: Record<PostType, string> = {
  LOST: 'badge badge-lost',
  FOUND: 'badge badge-found',
  ADOPTION: 'badge badge-adoption',
  MARKETPLACE: 'badge badge-found',
  TRADE: 'badge badge-trade',
};

const BADGE_LABEL: Record<PostType, string> = {
  LOST: 'Bị lạc',
  FOUND: 'Đã tìm thấy',
  ADOPTION: 'Cần người nuôi',
  MARKETPLACE: 'Đồ dùng',
  TRADE: 'Mua bán boss',
};

const STATUS_LABEL: Record<PostType, Record<PostStatus, string>> = {
  LOST: { OPEN: 'Đang tìm', RESOLVED: 'Đã tìm thấy', CLOSED: 'Đã đóng tin' },
  FOUND: { OPEN: 'Đang chờ nhận', RESOLVED: 'Đã trả về chủ', CLOSED: 'Đã đóng tin' },
  ADOPTION: { OPEN: 'Còn bé chờ nhận nuôi', RESOLVED: 'Đã có chủ mới', CLOSED: 'Đã đóng tin' },
  MARKETPLACE: { OPEN: 'Còn đồ', RESOLVED: 'Đã cho xong', CLOSED: 'Đã đóng tin' },
  TRADE: { OPEN: 'Còn hàng', RESOLVED: 'Đã bán', CLOSED: 'Đã đóng tin' },
};

const LIST_PATH: Record<PostType, string> = {
  LOST: '/lost-found',
  FOUND: '/lost-found',
  ADOPTION: '/adoption',
  MARKETPLACE: '/marketplace',
  TRADE: '/trade',
};

const GENDER_LABEL: Record<PetGender, string> = {
  MALE: 'Đực',
  FEMALE: 'Cái',
  UNKNOWN: 'Chưa rõ',
};

const PET_STATUS_LABEL: Record<AdoptionPetStatus, string> = {
  PENDING: 'Chờ nhận nuôi',
  ADOPTED: 'Đã có chủ',
};

const PET_STATUS_OPTIONS: { value: AdoptionPetStatus; label: string }[] = [
  { value: 'PENDING', label: PET_STATUS_LABEL.PENDING },
  { value: 'ADOPTED', label: PET_STATUS_LABEL.ADOPTED },
];

interface Props {
  post: PostDetail | null;
  authorPostCount: number;
}

export default function PostDetailPage({ post, authorPostCount }: Props) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [status, setStatus] = useState<PostStatus>(post?.status ?? 'OPEN');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<PostStatus | null>(null);
  const [pets, setPets] = useState<AdoptionPetInfo[]>(post?.pets ?? []);
  const [updatingPetIndex, setUpdatingPetIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const { user, accessToken } = useAuth();

  if (!post) {
    return (
      <div className={`container ${styles.wrapper}`}>
        <p className={styles.notFound}>Không tìm thấy bài đăng.</p>
      </div>
    );
  }

  const images = post.images ?? [];
  const isOwner = !!user && !!post.author && user.id === post.author.id;
  const hasLocation = post.latitude != null && post.longitude != null;

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === status) return;
    setPendingStatus(newStatus as PostStatus);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/posts/${post.id}`, { status: pendingStatus }, accessToken || undefined);
      setStatus(pendingStatus);
      setToast({ message: 'Đã cập nhật trạng thái tin.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Cập nhật trạng thái thất bại.', type: 'error' });
    } finally {
      setUpdatingStatus(false);
      setPendingStatus(null);
    }
  };

  const handlePetStatusChange = async (index: number, newStatus: AdoptionPetStatus) => {
    if (pets[index]?.status === newStatus) return;
    const updatedPets = pets.map((pet, i) => (i === index ? { ...pet, status: newStatus } : pet));
    setUpdatingPetIndex(index);
    try {
      const updated = await api.patch(`/posts/${post.id}`, { pets: updatedPets }, accessToken || undefined);
      setPets(updated.pets ?? updatedPets);
      setStatus(updated.status);
      setToast({ message: 'Đã cập nhật trạng thái bé.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Cập nhật trạng thái thất bại.', type: 'error' });
    } finally {
      setUpdatingPetIndex(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/posts/${post.id}`, accessToken || undefined);
      router.push(`${LIST_PATH[post.type]}?deleted=1`);
    } catch (err: any) {
      setDeleting(false);
      setConfirmDeleteOpen(false);
      setToast({ message: err.message || 'Xóa bài đăng thất bại.', type: 'error' });
    }
  };

  const handleMessageComingSoon = () => {
    setToast({ message: 'Tính năng nhắn tin sắp ra mắt.', type: 'success' });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast({ message: 'Đã sao chép liên kết bài đăng!', type: 'success' });
    } catch {
      // User cancelled the share sheet or clipboard write failed — no-op
    }
  };

  return (
    <div className={`container ${styles.wrapper}`}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDeleteOpen && (
        <ConfirmDialog
          title="Xóa bài đăng?"
          message="Bạn có chắc chắn muốn xóa bài đăng này? Hành động này không thể hoàn tác."
          confirmText="Xóa tin"
          danger
          confirming={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
      {pendingStatus && (
        <ConfirmDialog
          title="Đổi trạng thái tin?"
          message={`Chuyển trạng thái tin sang "${STATUS_LABEL[post.type][pendingStatus]}"?`}
          confirmText="Xác nhận"
          confirming={updatingStatus}
          onConfirm={confirmStatusChange}
          onCancel={() => setPendingStatus(null)}
        />
      )}

      <div className={styles.backRow}>
        <Link href={LIST_PATH[post.type]} className={styles.backLink}>
          ‹ Quay lại danh sách
        </Link>
      </div>

      <div className={styles.layout}>
        <div className={styles.content}>
          <div className={styles.mainImageWrapper}>
            <img
              className={styles.mainImage}
              src={images.length > 0 ? toAssetUrl(images[activeImage]) : '/logo.jpg'}
              alt={post.title}
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
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{post.title}</h1>
              <div className={styles.badgeRow}>
                <span className={BADGE_CLASS[post.type]}>{BADGE_LABEL[post.type]}</span>
                {isOwner ? (
                  <Dropdown
                    compact
                    value={status}
                    disabled={updatingStatus}
                    onChange={handleStatusChange}
                    options={(['OPEN', 'RESOLVED', 'CLOSED'] as PostStatus[]).map((s) => ({
                      value: s,
                      label: STATUS_LABEL[post.type][s],
                    }))}
                  />
                ) : (
                  <span className={`badge ${status === 'OPEN' ? 'badge-status-open' : 'badge-status-done'}`}>
                    {STATUS_LABEL[post.type][status]}
                  </span>
                )}
                {pets.length > 1 && <span className="badge badge-adoption">{pets.length} bé</span>}
              </div>
            </div>
            <p className={styles.meta}>
              Đăng {formatRelativeTime(post.createdAt)}
              {post.address && (
                <>
                  {' · '}
                  <MapPin size={14} style={{ verticalAlign: -2 }} /> {post.address}
                </>
              )}
            </p>
            {post.price != null && <p className={styles.price}>{post.price.toLocaleString('vi-VN')}đ</p>}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Mô tả</h3>
            <p className={styles.description}>{post.description || '-'}</p>
          </div>

          {hasLocation && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Vị trí</h3>
              <PostLocationMap latitude={post.latitude as number} longitude={post.longitude as number} />
            </div>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Thông tin chi tiết</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span>Loài</span>
                {post.species || '-'}
              </div>
              <div className={styles.infoItem}>
                <span>Giống</span>
                {post.breed || '-'}
              </div>
              <div className={styles.infoItem}>
                <span>Màu sắc</span>
                {post.color || '-'}
              </div>
              <div className={styles.infoItem}>
                <span>Cân nặng</span>
                {post.size != null ? `${post.size} kg` : '-'}
              </div>
              <div className={styles.infoItem}>
                <span>Giới tính</span>
                {post.gender ? GENDER_LABEL[post.gender] : '-'}
              </div>
              <div className={styles.infoItem}>
                <span>Vòng cổ/thẻ bài</span>
                {post.collarDescription || '-'}
              </div>
            </div>
          </div>

          {pets.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Danh sách bé cần tìm sen</h3>
              <div className={styles.petTableWrapper}>
                <table className={styles.petTable}>
                  <thead>
                    <tr>
                      <th>Loài</th>
                      <th>Giống</th>
                      <th>Màu sắc</th>
                      <th>Tuổi (tháng)</th>
                      <th>Giới tính</th>
                      <th>Cân nặng (kg)</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pets.map((pet, idx) => (
                      <tr key={idx}>
                        <td>{pet.species}</td>
                        <td>{pet.breed || '-'}</td>
                        <td>{pet.color || '-'}</td>
                        <td>{pet.age ?? '-'}</td>
                        <td>{pet.gender ? GENDER_LABEL[pet.gender] : '-'}</td>
                        <td>{pet.size ?? '-'}</td>
                        <td>
                          {isOwner ? (
                            <Dropdown
                              size="sm"
                              value={pet.status ?? 'PENDING'}
                              disabled={updatingPetIndex === idx}
                              onChange={(value) => handlePetStatusChange(idx, value as AdoptionPetStatus)}
                              options={PET_STATUS_OPTIONS}
                            />
                          ) : (
                            <span
                              className={`badge ${pet.status === 'ADOPTED' ? 'badge-status-done' : 'badge-status-open'}`}
                            >
                              {PET_STATUS_LABEL[pet.status ?? 'PENDING']}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          {post.author && (
            <div className={styles.posterCard}>
              <div className={styles.posterRow}>
                <img
                  className={styles.posterAvatar}
                  src={toAssetUrl(post.author.avatarUrl) || '/logo.jpg'}
                  alt={post.author.name}
                />
                <div>
                  <p className={styles.posterName}>{post.author.name}</p>
                  <p className={styles.posterMeta}>Đã đăng {authorPostCount} tin</p>
                </div>
              </div>
              {post.author.phone && (
                <p className={styles.posterPhone}>
                  <Phone size={14} style={{ verticalAlign: -2 }} /> {post.author.phone}
                </p>
              )}
              {!isOwner && (
                <>
                  <button type="button" className="btn btn-primary" onClick={handleMessageComingSoon}>
                    <MessageCircle size={16} /> Nhắn tin cho người đăng
                  </button>
                  {post.type === 'FOUND' && (
                    <button type="button" className="btn btn-outline" onClick={handleMessageComingSoon}>
                      Mình nghĩ đây là bé của mình
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {isOwner && (
            <div className={styles.ownerCard}>
              <div className={styles.ownerCardTitle}>Chủ post</div>
              <Dropdown
                value={status}
                disabled={updatingStatus}
                onChange={handleStatusChange}
                options={(['OPEN', 'RESOLVED', 'CLOSED'] as PostStatus[]).map((s) => ({
                  value: s,
                  label: STATUS_LABEL[post.type][s],
                }))}
              />
              <Link href={`/posts/${post.id}/edit`} className={styles.sidebarLink}>
                <Pencil size={16} /> Sửa tin
              </Link>
              <button
                type="button"
                className={`${styles.sidebarLink} ${styles.sidebarLinkDanger}`}
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleting}
              >
                <Trash2 size={16} /> {deleting ? 'Đang xóa...' : 'Xóa tin'}
              </button>
            </div>
          )}

          <button type="button" className={styles.shareBtn} onClick={handleShare}>
            <Share2 size={14} /> Chia sẻ
          </button>
        </aside>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = ctx.params?.id as string;
  try {
    const post = await api.get(`/posts/${id}`);
    let authorPostCount = 0;
    if (post?.author?.id) {
      try {
        const authorPosts = await api.get(`/posts?authorId=${post.author.id}`);
        authorPostCount = authorPosts.length;
      } catch {
        // Best-effort only — sidebar just shows 0 posts if this fails
      }
    }
    return { props: { post, authorPostCount } };
  } catch {
    return { props: { post: null, authorPostCount: 0 } };
  }
};
