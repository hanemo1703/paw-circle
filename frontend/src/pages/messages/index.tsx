import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, toAssetUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { connectSocket } from '../../lib/socket';
import { formatRelativeTime } from '../../lib/format';
import styles from './index.module.scss';

const PAGE_SIZE = 20;

interface Conversation {
  otherUser: { id: string; name: string; avatarUrl?: string };
  lastMessage: { content: string; createdAt: string; senderId: string };
  unreadCount: number;
}

// Compact page-number list with ellipsis for large result sets, e.g. [1, 2, '...', 5, 6, 7, '...', 12].
function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = Array.from(keep)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | '...')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!checkingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [checkingAuth, isAuthenticated, router]);

  useEffect(() => {
    if (!user || !accessToken) return;

    let cancelled = false;
    async function refresh() {
      try {
        const res: { data: Conversation[]; total: number } = await api.get(
          `/messages?page=${page}&limit=${PAGE_SIZE}`,
          accessToken ?? undefined,
        );
        if (!cancelled) {
          setConversations(res.data);
          setTotal(res.total);
        }
      } catch {
        // Best-effort — list just keeps its last known state on transient failures
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    refresh();

    const socket = connectSocket(accessToken);
    socket.on('message:new', refresh);
    socket.on('message:read', refresh);

    return () => {
      cancelled = true;
      socket.off('message:new', refresh);
      socket.off('message:read', refresh);
    };
  }, [user, accessToken, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  if (!user) {
    return null;
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <h1 className={styles.title}>Nhắn tin</h1>

      {!loading && conversations.length === 0 ? (
        <div className={styles.card}>
          <div className={styles.emptyState}>
            Bạn chưa có cuộc trò chuyện nào.
            <br />
            Ghé thăm một bài đăng và bấm &quot;Nhắn tin cho người đăng&quot; để bắt đầu.
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          {conversations.map((c) => {
            const unread = c.unreadCount > 0;
            const previewPrefix = c.lastMessage.senderId === user.id ? 'Bạn: ' : '';
            return (
              <Link
                key={c.otherUser.id}
                href={`/messages/${c.otherUser.id}`}
                className={styles.msgRow}
              >
                <img
                  className={styles.avatar}
                  src={toAssetUrl(c.otherUser.avatarUrl) || '/logo.jpg'}
                  alt={c.otherUser.name}
                  loading="lazy"
                />
                <div className={styles.msgBody}>
                  <div className={`${styles.msgName} ${unread ? styles.unread : ''}`}>
                    {c.otherUser.name}
                  </div>
                  <div className={`${styles.msgPreview} ${unread ? styles.unread : ''}`}>
                    {previewPrefix}
                    {c.lastMessage.content}
                  </div>
                </div>
                <div className={styles.msgMeta}>
                  <div className={styles.msgTime}>{formatRelativeTime(c.lastMessage.createdAt)}</div>
                  {unread && <div className={styles.unreadDot}>{c.unreadCount}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>
          {getPageNumbers(currentPage, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            className={styles.pageBtn}
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
            aria-label="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
