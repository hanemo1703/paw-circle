import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { NAV_ITEMS } from '../lib/nav';
import { useUnreadMessages } from '../lib/useUnreadMessages';
import UserMenu from './UserMenu';
import styles from './Header.module.scss';

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const unreadCount = useUnreadMessages();

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
          {isAuthenticated && user ? (
            <>
              <Link
                href="/messages"
                className={`${styles.messagesLink} ${router.pathname.startsWith('/messages') ? styles.messagesLinkActive : ''}`}
                title="Nhắn tin"
                aria-label="Nhắn tin"
              >
                <MessageCircle size={21} />
                {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
              </Link>
              <UserMenu user={user} onLogout={handleLogout} />
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
