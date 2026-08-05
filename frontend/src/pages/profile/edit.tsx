import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/useToast';
import AvatarUploader from '../../components/AvatarUploader';
import styles from './edit.module.scss';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated, updateUser } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showPhonePublicly, setShowPhonePublicly] = useState(true);
  const [showEmailPublicly, setShowEmailPublicly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { showToast, toastNode } = useToast();

  useEffect(() => {
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!checkingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [checkingAuth, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || '');
      setShowPhonePublicly(user.showPhonePublicly ?? true);
      setShowEmailPublicly(user.showEmailPublicly ?? false);
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await api.patch(
        `/users/${user.id}`,
        { name, phone, avatarUrl, showPhonePublicly, showEmailPublicly },
        accessToken || undefined,
      );
      updateUser(updated);
      showToast('Cập nhật hồ sơ thành công!');
      setTimeout(() => router.push('/profile'), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      {toastNode}
      <div className={styles.backRow}>
        <Link href="/profile" className={styles.backLink}>
          ‹ Quay lại hồ sơ
        </Link>
      </div>
      <h1 className={styles.title}>Chỉnh sửa hồ sơ</h1>
      <form onSubmit={handleSubmit} className={styles.card}>
        <div className={styles.field}>
          <label>Ảnh đại diện</label>
          <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} accessToken={accessToken || undefined} />
        </div>
        <div className={styles.field}>
          <label htmlFor="name">Tên</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="phone">Số điện thoại</label>
          <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className={styles.checkboxField}>
          <label>
            <input
              type="checkbox"
              checked={showPhonePublicly}
              onChange={(e) => setShowPhonePublicly(e.target.checked)}
            />
            Hiển thị số điện thoại công khai (kể cả trong bài đăng của bạn)
          </label>
        </div>
        <div className={styles.checkboxField}>
          <label>
            <input
              type="checkbox"
              checked={showEmailPublicly}
              onChange={(e) => setShowEmailPublicly(e.target.checked)}
            />
            Hiển thị email công khai
          </label>
        </div>
        {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}
        <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
}
