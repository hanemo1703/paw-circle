import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { api } from './api';
import { connectSocket } from './socket';

interface Conversation {
  unreadCount: number;
}

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
        const conversations: Conversation[] = await api.get('/messages', accessToken ?? undefined);
        if (!cancelled) {
          setUnreadCount(conversations.reduce((sum, c) => sum + c.unreadCount, 0));
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
