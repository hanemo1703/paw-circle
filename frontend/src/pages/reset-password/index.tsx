import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import styles from './index.module.scss';

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Đặt lại mật khẩu</h1>
      {!router.isReady ? null : !token ? (
        <div className={styles.successBox}>
          <p>Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu liên kết mới.</p>
        </div>
      ) : done ? (
        <div className={styles.successBox}>
          <p>Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="password">Mật khẩu mới</label>
            <input
              id="password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
            <input
              id="confirmPassword"
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}
          <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>
      )}
      <Link href="/login" className={styles.backLink}>
        ‹ Quay lại đăng nhập
      </Link>
    </div>
  );
}
