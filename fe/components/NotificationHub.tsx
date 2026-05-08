'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, CheckCheck, Inbox } from 'lucide-react'; 
import { useNotificationStore } from '@/stores/notificationStore';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth'; 
import { nestApi } from '@/lib/axiosClient';

export default function NotificationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();
  
  // Bổ sung addNotification 
  const { notifications, setNotifications, addNotification, markAsRead, markAllAsRead, unreadCount } = useNotificationStore();
  const unread = unreadCount();

  useEffect(() => {
    if (!user?.id) return;

    let eventSource: EventSource | null = null;

    const syncNotifications = async () => {
      try {
        // 1. GỌI API LẤY LỊCH SỬ TỪ DATABASE TRƯỚC (Đảm bảo không bao giờ sót tin)
        console.log("📥 Đang tải lịch sử thông báo...");
        const res = await nestApi.get('/users/me/notifications');
        setNotifications(res.data); // Đập dữ liệu cũ vào Store

        // 2. KẾT NỐI BỘ ĐÀM SSE ĐỂ HỨNG TIN MỚI SAU KHI ĐÃ CÓ LỊCH SỬ
        console.log(`⏳ Đang cắm trạm Radar SSE...`);
        const baseUrl = process.env.NEXT_PUBLIC_API_PIM_URL || 'http://localhost:4000/api';
        eventSource = new EventSource(`${baseUrl}/sse/${user.id}`);

        eventSource.onmessage = (event) => {
          try {
            if(!event.data) return;
            const newNotif = JSON.parse(event.data);
            if (newNotif.type === 'ping') return;
            
            console.log("📨 [SSE] CÓ TIN MỚI TỪ SERVER:", newNotif);
            addNotification(newNotif); // Thêm tin mới đẩy lên đầu danh sách
          } catch (error) {
            console.error("Lỗi parse dữ liệu SSE:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("🔴 [SSE] Trạm Radar chập chờn, đang tự động kết nối lại...", error);
        };

      } catch (error) {
        console.error("❌ Lỗi khi tải lịch sử thông báo:", error);
      }
    };

    syncNotifications();

    // Dọn dẹp kết nối khi đăng xuất hoặc đóng tab
    return () => {
      if (eventSource) {
        console.log("🔌 Rút phích cắm Radar...");
        eventSource.close();
      }
    }
  }, [user?.id, setNotifications, addNotification]); // Chạy lại nếu user đăng nhập tài khoản khác

  // Đóng popover khi click ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifClick = (notif: any) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.orderId) {
      router.push(`/orders/${notif.orderId}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ICON MÁY BAY GIẤY */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100"
      >
        <Send size={24} className={isOpen ? 'text-blue-600 fill-blue-50' : ''} />
        
        {/* Chấm đỏ báo tin nhắn mới */}
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-bounce">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* DROPDOWN DANH SÁCH THÔNG BÁO */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b bg-slate-50/80 backdrop-blur-sm">
            <h3 className="font-bold text-gray-800 text-lg">Thông báo của bạn</h3>
            {unread > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <CheckCheck size={14} /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* Danh sách */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Inbox size={48} className="mb-3 opacity-20" />
                <p>Bạn không có thông báo nào!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotifClick(notif)}
                  className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50 flex gap-4 ${!notif.isRead ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="mt-1">
                    <div className={`w-2 h-2 rounded-full ${!notif.isRead ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                  </div>
                  <div>
                    <h4 className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                      {notif.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-2 block">
                      {new Date(notif.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t bg-gray-50 text-center">
            <button 
              onClick={() => {
                setIsOpen(false);
                router.push('/orders'); 
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}