import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Pencil } from 'lucide-react';
import { api, toAssetUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import styles from './index.module.scss';

interface StatSummary {
  postCount: number;
  reunitedCount: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<StatSummary>({ postCount: 0, reunitedCount: 0 });
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!checkingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [checkingAuth, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get(`/posts?authorId=${user.id}&limit=1`),
      api.get(`/posts?authorId=${user.id}&type=LOST&status=RESOLVED&limit=1`),
    ])
      .then(([posts, reunited]) => {
        setStats({ postCount: posts.total, reunitedCount: reunited.total });
      })
      .catch(() => {
        // Best-effort only — stat chips just stay at 0 if this fails
      });
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <h1 className={styles.title}>Hồ sơ của tôi</h1>
      <div className={styles.card}>
        <div className={styles.avatarWrapper}>
          <img className={styles.avatar} src={toAssetUrl(user.avatarUrl) || '/logo.jpg'} alt={user.name} />
          <Link href="/profile/edit" className={styles.avatarEditBadge} aria-label="Chỉnh sửa hồ sơ">
            <Pencil size={14} />
          </Link>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statChip}>
            <div className={styles.statNum}>{stats.postCount}</div>
            <div className={styles.statLabel}>Bài đăng</div>
          </div>
          <div className={styles.statChip}>
            <div className={styles.statNum}>{stats.reunitedCount}</div>
            <div className={styles.statLabel}>Đoàn tụ</div>
          </div>
        </div>

        <div className={styles.info}>
          <div className={styles.field}>
            <span>Tên</span>
            <p>{user.name}</p>
          </div>
          <div className={styles.field}>
            <span>Email</span>
            <p>{user.email}</p>
          </div>
          <div className={`${styles.field} ${styles.fieldLast}`}>
            <span>Số điện thoại</span>
            <p>{user.phone || 'Chưa cập nhật'}</p>
          </div>
        </div>

        <Link href="/profile/edit" className="btn btn-primary">
          Chỉnh sửa hồ sơ
        </Link>
      </div>
    </div>
  );
}
