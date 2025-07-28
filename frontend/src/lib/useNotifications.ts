import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { api } from './api';
import { connectSocket } from './socket';

export interface AppNotification {
  id: string;
  type: 'MESSAGE' | 'DONATION';
  content: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const { accessToken, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setNotifications([]);
      return;
    }
    const token = accessToken;

    let cancelled = false;
    async function refresh() {
      try {
        const data: AppNotification[] = await api.get('/notifications', token);
        if (!cancelled) setNotifications(data);
      } catch {
        // Transient fetch failure; next socket event or remount will retry.
      }
    }
    refresh();

    const socket = connectSocket(token);
    function handleNew(notification: AppNotification) {
      setNotifications((prev) => [notification, ...prev]);
    }
    socket.on('notification:new', handleNew);

    return () => {
      cancelled = true;
      socket.off('notification:new', handleNew);
    };
  }, [isAuthenticated, accessToken]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (accessToken) {
      api.patch(`/notifications/${id}/read`, {}, accessToken).catch(() => {});
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (accessToken) {
      api.patch('/notifications/read-all', {}, accessToken).catch(() => {});
    }
  }

  return { notifications, unreadCount, markRead, markAllRead };
}
