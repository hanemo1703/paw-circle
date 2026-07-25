import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import { toAssetUrl } from '../../lib/api';
import styles from './index.module.scss';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!user) {
    return null;
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <h1 className={styles.title}>Hồ sơ của tôi</h1>
      <div className={styles.card}>
        <img className={styles.avatar} src={toAssetUrl(user.avatarUrl) || '/logo.jpg'} alt={user.name} />
        <div className={styles.info}>
          <div className={styles.field}>
            <span>Tên</span>
            <p>{user.name}</p>
          </div>
          <div className={styles.field}>
            <span>Email</span>
            <p>{user.email}</p>
          </div>
          <div className={styles.field}>
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
