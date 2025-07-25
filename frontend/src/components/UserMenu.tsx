import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AuthUser } from '../lib/auth';
import { toAssetUrl } from '../lib/api';
import styles from './UserMenu.module.scss';

interface UserMenuProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function UserMenu({ user, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button type="button" className={styles.trigger} onClick={() => setOpen((o) => !o)}>
        <img className={styles.avatar} src={toAssetUrl(user.avatarUrl) || '/logo.jpg'} alt={user.name} />
        <span className={styles.name}>{user.name}</span>
      </button>
      {open && (
        <ul className={styles.menu} role="menu">
          <li>
            <Link href="/profile" className={styles.item} onClick={() => setOpen(false)}>
              Tài khoản
            </Link>
          </li>
          <li>
            <Link href="/profile/posts" className={styles.item} onClick={() => setOpen(false)}>
              Bài post của tôi
            </Link>
          </li>
          <li>
            <span className={`${styles.item} ${styles.itemDisabled}`}>Bài post đã lưu</span>
          </li>
          <li>
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              Đăng xuất
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
