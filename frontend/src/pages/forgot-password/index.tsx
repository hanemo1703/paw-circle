import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import styles from './index.module.scss';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Quên mật khẩu</h1>
      {sent ? (
        <div className={styles.successBox}>
          <p>
            Nếu email <strong>{email}</strong> tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã
            được gửi. Vui lòng kiểm tra hộp thư.
          </p>
        </div>
      ) : (
        <>
          <p className={styles.hint}>Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.</p>
          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}
            <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
            </button>
          </form>
        </>
      )}
      <Link href="/login" className={styles.backLink}>
        ‹ Quay lại đăng nhập
      </Link>
    </div>
  );
}
