import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api, toAssetUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { connectSocket } from '../../lib/socket';
import { formatRelativeTime } from '../../lib/format';
import styles from './index.module.scss';

interface Conversation {
  otherUser: { id: string; name: string; avatarUrl?: string };
  lastMessage: { content: string; createdAt: string; senderId: string };
  unreadCount: number;
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!user || !accessToken) return;

    let cancelled = false;
    async function refresh() {
      try {
        const data: Conversation[] = await api.get('/messages', accessToken ?? undefined);
        if (!cancelled) setConversations(data);
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
  }, [user, accessToken]);

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
    </div>
  );
}
