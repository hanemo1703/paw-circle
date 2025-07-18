import { useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import Toast, { ToastType } from '../../components/Toast';
import GoogleAuthButton from '../../components/GoogleAuthButton';
import FacebookAuthButton from '../../components/FacebookAuthButton';
import styles from './index.module.scss';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password });
      router.push('/login?registered=1');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className={styles.title}>Tạo tài khoản</h1>
      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="name">Họ tên</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
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
        <div className={styles.field}>
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}
        <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
          {loading ? 'Đang tạo...' : 'Đăng ký'}
        </button>
      </form>
      {(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) && (
        <>
          <div className={styles.divider}>hoặc</div>
          <div className={styles.socialButtons}>
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <div className={styles.googleWrapper}>
                <GoogleAuthButton
                  onSuccess={() => {
                    setToast({ message: 'Đăng nhập thành công!', type: 'success' });
                    setTimeout(() => router.push('/'), 1200);
                  }}
                  onError={(message) => setError(message)}
                />
              </div>
            )}
            {process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && (
              <div className={styles.facebookWrapper}>
                <FacebookAuthButton
                  onSuccess={() => {
                    setToast({ message: 'Đăng nhập thành công!', type: 'success' });
                    setTimeout(() => router.push('/'), 1200);
                  }}
                  onError={(message) => setError(message)}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
