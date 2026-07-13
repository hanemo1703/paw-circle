import Link from 'next/link';
import styles from './Header.module.scss';

const NAV_ITEMS = [
  { href: '/lost-found', label: 'Thú lạc' },
  { href: '/adoption', label: 'Nhận nuôi' },
  { href: '/marketplace', label: 'Đồ dùng' },
  { href: '/donations', label: 'Gây quỹ' },
];

export default function Header() {
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
          <Link href="/login" className="btn btn-outline">
            Đăng nhập
          </Link>
          <Link href="/register" className="btn btn-primary">
            Đăng ký
          </Link>
        </div>
      </div>
    </header>
  );
}
