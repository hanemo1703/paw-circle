import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { api } from './api';
import { connectSocket } from './socket';

export function useUnreadMessages() {
  const { accessToken, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    async function refresh() {
      try {
        // Independent of the (now paginated) inbox list, so the badge stays accurate
        // even when a user has unread messages outside the inbox's first page.
        const res: { count: number } = await api.get('/messages/unread-count', accessToken ?? undefined);
        if (!cancelled) {
          setUnreadCount(res.count);
        }
      } catch {
        // Transient fetch failure; next socket event or remount will retry.
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
  }, [isAuthenticated, accessToken]);

  return unreadCount;
}
