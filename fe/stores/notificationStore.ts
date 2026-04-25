import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  orderId?: string;
}

interface NotificationState {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notif: Partial<Notification> & { title: string, message: string, id?: string, isRead?: boolean, createdAt?: string}) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notif) => set((state) => ({
    notifications: [
      {
        ...notif,
        id: notif.id || Math.random().toString(36).substring(7),
        isRead: notif.isRead || false,
        createdAt: notif.createdAt || new Date().toISOString()
      } as Notification,
      ...state.notifications
    ]
  })),

  // Hàm đánh dấu đã đọc 1 tin
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    )
  })),

  // Hàm đánh dấu đã đọc tất cả
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, isRead: true }))
  })),

  // Đếm số tin chưa đọc để hiển thị chấm đỏ
  unreadCount: () => get().notifications.filter(n => !n.isRead).length
}));