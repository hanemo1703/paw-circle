import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import styles from './Header.module.scss';

const NAV_ITEMS = [
  { href: '/lost-found', label: 'Thú lạc' },
  { href: '/adoption', label: 'Nhận nuôi' },
  { href: '/marketplace', label: 'Đồ dùng' },
  { href: '/donations', label: 'Gây quỹ' },
];

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          🐾 PawCircle
        </Link>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <span className={styles.userName}>Xin chào, {user?.name}</span>
              <button type="button" className="btn btn-outline" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-outline">
                Đăng nhập
              </Link>
              <Link href="/register" className="btn btn-primary">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
