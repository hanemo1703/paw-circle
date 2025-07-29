import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/useToast';
import GoogleAuthButton from '../../components/GoogleAuthButton';
import FacebookAuthButton from '../../components/FacebookAuthButton';
import styles from './index.module.scss';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast, toastNode } = useToast();

  useEffect(() => {
    if (router.isReady && router.query.registered === '1') {
      showToast('Đăng ký thành công! Vui lòng đăng nhập.');
      router.replace('/login', undefined, { shallow: true });
    }
  }, [router.isReady, router.query.registered]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.accessToken, res.user);
      showToast('Đăng nhập thành công!');
      setTimeout(() => router.push('/'), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {toastNode}
      <h1 className={styles.title}>Đăng nhập</h1>
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
        <div className={styles.field}>
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red', fontSize: 14 }}>{error}</p>}
        <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
      <Link href="/forgot-password" className={styles.forgotLink}>
        Quên mật khẩu?
      </Link>
      {(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) && (
        <>
          <div className={styles.divider}>hoặc</div>
          <div className={styles.socialButtons}>
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <div className={styles.googleWrapper}>
                <GoogleAuthButton
                  onSuccess={() => {
                    showToast('Đăng nhập thành công!');
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
                    showToast('Đăng nhập thành công!');
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
