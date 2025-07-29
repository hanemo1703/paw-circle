import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api, toAssetUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { connectSocket } from '../../../lib/socket';
import Toast, { ToastType } from '../../../components/Toast';
import styles from './index.module.scss';

interface OtherUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender?: OtherUser;
  receiver?: OtherUser;
  pending?: boolean;
}

export default function MessageThreadPage() {
  const router = useRouter();
  const { userId } = router.query;
  const otherUserId = typeof userId === 'string' ? userId : undefined;
  const { user, accessToken, isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const { prefill } = router.query;
    if (typeof prefill !== 'string' || !otherUserId) return;
    setDraft(prefill);
    router.replace(`/messages/${otherUserId}`, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, router.query.prefill]);

  useEffect(() => {
    if (!user || !accessToken || !otherUserId) return;
    const currentUserId = user.id;
    const token = accessToken;

    let cancelled = false;
    async function load() {
      try {
        const res: { data: ChatMessage[]; hasMore: boolean } = await api.get(`/messages/${otherUserId}`, token);
        if (cancelled) return;
        setMessages(res.data);
        setHasMore(res.hasMore);
        requestAnimationFrame(scrollToBottom);

        const first = res.data[0];
        if (first) {
          setOtherUser(first.senderId === currentUserId ? first.receiver! : first.sender!);
        } else {
          const publicProfile = await api.get(`/users/${otherUserId}`);
          if (!cancelled) setOtherUser(publicProfile);
        }

        await api.patch(`/messages/${otherUserId}/read`, {}, token);
      } catch {
        // Best-effort — thread just stays empty on transient failures
      }
    }
    load();

    const socket = connectSocket(token);
    function handleNewMessage(message: ChatMessage) {
      if (message.senderId !== otherUserId && message.receiverId !== otherUserId) return;
      setMessages((prev) => [...prev, message]);
      requestAnimationFrame(scrollToBottom);
      if (message.senderId === otherUserId) {
        api.patch(`/messages/${otherUserId}/read`, {}, token).catch(() => {});
      }
    }
    socket.on('message:new', handleNewMessage);

    return () => {
      cancelled = true;
      socket.off('message:new', handleNewMessage);
    };
  }, [user, accessToken, otherUserId]);

  // Infinite scroll: fetching older history when scrolled near the top of the
  // thread, preserving scroll position so the view doesn't jump after prepending.
  useEffect(() => {
    const el = listRef.current;
    if (!el || !accessToken || !otherUserId) return;
    const token = accessToken;

    async function handleScroll() {
      if (!el || el.scrollTop > 80 || loadingOlder || !hasMore || messages.length === 0) return;
      const oldest = messages[0];
      setLoadingOlder(true);
      const prevScrollHeight = el.scrollHeight;
      try {
        const res: { data: ChatMessage[]; hasMore: boolean } = await api.get(
          `/messages/${otherUserId}?before=${encodeURIComponent(oldest.createdAt)}`,
          token,
        );
        setMessages((prev) => [...res.data, ...prev]);
        setHasMore(res.hasMore);
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevScrollHeight;
        });
      } catch {
        // Best-effort — user can retry by scrolling up again
      } finally {
        setLoadingOlder(false);
      }
    }

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [accessToken, otherUserId, messages, hasMore, loadingOlder]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || !otherUserId || !accessToken || !user) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      content,
      senderId: user.id,
      receiverId: otherUserId,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    requestAnimationFrame(scrollToBottom);
    setDraft('');
    setSending(true);

    try {
      const saved: ChatMessage = await api.post(`/messages/${otherUserId}`, { content }, accessToken);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(content);
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSending(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <Link href="/messages" className={styles.backLink}>
        ← Quay lại tin nhắn
      </Link>

      <div className={styles.card}>
        <div className={styles.threadHeader}>
          <img
            className={styles.headerAvatar}
            src={toAssetUrl(otherUser?.avatarUrl) || '/logo.jpg'}
            alt={otherUser?.name || ''}
          />
          <div className={styles.headerName}>{otherUser?.name || '...'}</div>
        </div>

        <div className={styles.msgList} ref={listRef}>
          {loadingOlder && <div className={styles.loadingOlder}>Đang tải tin nhắn cũ hơn...</div>}
          {messages.length === 0 && otherUser && (
            <div className={styles.emptyThread}>
              <div className={styles.emptyThreadTitle}>Bắt đầu trò chuyện với {otherUser.name}</div>
              <div className={styles.emptyThreadText}>
                Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên nhé!
              </div>
            </div>
          )}
          {messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div key={m.id} className={`${styles.bubbleRow} ${mine ? styles.mine : styles.theirs}`}>
                <div className={`${styles.bubbleCol} ${mine ? styles.mine : styles.theirs}`}>
                  <div
                    className={`${styles.bubble} ${mine ? styles.mine : styles.theirs}`}
                    style={m.pending ? { opacity: 0.6 } : undefined}
                  >
                    {m.content}
                  </div>
                  <div className={styles.bubbleMeta}>
                    {m.pending
                      ? 'Đang gửi...'
                      : new Date(m.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.composer}>
          <input
            className={styles.composerInput}
            placeholder="Nhập tin nhắn..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !sending) handleSend();
            }}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={sending || !draft.trim()}>
            Gửi
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
