import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import styles from './Header.module.scss';

const NAV_ITEMS = [
  { href: '/lost-found', label: 'Boss lạc đường' },
  { href: '/adoption', label: 'Tìm sen cho boss' },
  { href: '/marketplace', label: 'Tặng đồ' },
  { href: '/trade', label: 'Chợ boss' },
  { href: '/donations', label: 'Cứu trợ' },
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
          <Image src="/logo.jpg" alt="PawCircle" width={36} height={36} className={styles.logoImage} />
          PawCircle
        </Link>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${router.pathname === item.href ? styles.navLinkActive : ''}`}
            >
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
