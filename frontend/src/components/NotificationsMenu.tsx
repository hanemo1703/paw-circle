import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Bell } from 'lucide-react';
import { useNotifications, AppNotification } from '../lib/useNotifications';
import { formatRelativeTime } from '../lib/format';
import styles from './NotificationsMenu.module.scss';

export default function NotificationsMenu() {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
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

  function handleSelect(notification: AppNotification) {
    setOpen(false);
    if (!notification.isRead) markRead(notification.id);
    if (notification.link) router.push(notification.link);
  }

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        title="Thông báo"
        aria-label="Thông báo"
      >
        <Bell size={21} />
        {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.menuHeader}>
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <button type="button" className={styles.markAllBtn} onClick={() => markAllRead()}>
                Đánh dấu đã đọc hết
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className={styles.empty}>Chưa có thông báo nào.</div>
          ) : (
            <ul className={styles.list}>
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`${styles.item} ${!n.isRead ? styles.itemUnread : ''}`}
                    onClick={() => handleSelect(n)}
                  >
                    <span className={styles.itemContent}>{n.content}</span>
                    <span className={styles.itemTime}>{formatRelativeTime(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
