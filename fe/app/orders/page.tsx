'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { OrdersService } from '@/services/orders.service';
import { ShoppingBag, Search, ChevronRight, PackageX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';
// 🔥 BỔ SUNG IMPORT STORE NOTIFICATION
import { useNotificationStore } from '@/stores/notificationStore';

// Bộ từ điển dịch Status và cấp màu
const STATUS_MAP: Record<string, { label: string, color: string }> = {
  'PENDING': { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'PAID': { label: 'Đã thanh toán', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'SHIPPING': { label: 'Đang giao hàng', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  'DELIVERY': { label: 'Đang giao hàng', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  'COMPLETED': { label: 'Hoàn thành', color: 'bg-green-100 text-green-800 border-green-200' },
  'RECEIVE': { label: 'Đã nhận hàng', color: 'bg-green-100 text-green-800 border-green-200' },
  'CANCELLED': { label: 'Đã hủy', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  'REFUND_PENDING': { label: 'Chờ hoàn tiền', color: 'bg-red-100 text-red-800 border-red-200' },
  'REFUNDED_SUCCESS': { label: 'Đã hoàn tiền', color: 'bg-red-100 text-red-800 border-red-200' },
};

// 🔥 ĐÃ FIX 1: THÊM TAB "ĐÃ THANH TOÁN"
const TABS = ['TẤT CẢ', 'CHỜ XÁC NHẬN', 'ĐÃ THANH TOÁN', 'ĐANG GIAO', 'HOÀN THÀNH', 'ĐÃ HỦY'];

export default function OrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('TẤT CẢ');
  const [searchCode, setSearchCode] = useState('');
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);

  // 🔥 Kéo mảng notifications từ store ra để làm bẫy lắng nghe
  const { notifications } = useNotificationStore();

  // LOGIC 1: KIỂM TRA ĐĂNG NHẬP
  useEffect(() => {
    const initSession = async () => {
      if (!isAuthenticated && checkAuth) {
        try {
          await checkAuth(); 
        } catch (error) {
          console.error("Phiên đăng nhập không hợp lệ");
        }
      }
      setIsInitializing(false); 
    };
    initSession();
  }, [isAuthenticated, checkAuth]);

  // LOGIC 2: GỌI API LẤY ĐƠN HÀNG (Lấy thêm hàm refetch ra ngoài)
  const { data, isLoading: ordersLoading, error, refetch } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => OrdersService.getMyOrders(0, 50),
    enabled: isAuthenticated && !isInitializing
  });

  // 🔥 ĐÃ FIX 3: LOGIC "F5 NGẦM" (REAL-TIME)
  // Mỗi khi mảng notifications có sự thay đổi (có tin nhắn SSE mới bay xuống), gọi refetch() lập tức!
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      console.log('🔄 [Real-time] Có thông báo mới! Đang tự động cập nhật danh sách đơn hàng...');
      refetch();
    }
  }, [notifications, refetch]);

  // Hứng dữ liệu từ API chuẩn Spring Boot
  const rawOrders = data?.items || [];

  // Logic Lọc đơn hàng theo Tab và Thanh tìm kiếm
  const filteredOrders = rawOrders.filter((order: any) => {
    if (searchCode && !order.id.toLowerCase().includes(searchCode.toLowerCase())) return false;
    
    // 🔥 ĐÃ FIX 1.1: TÁCH RIÊNG ĐIỀU KIỆN LỌC
    switch (activeTab) {
      case 'CHỜ XÁC NHẬN': return order.status === 'PENDING';
      case 'ĐÃ THANH TOÁN': return order.status === 'PAID'; // Tab mới thêm
      case 'ĐANG GIAO': return order.status === 'SHIPPING' || order.status === 'DELIVERY';
      case 'HOÀN THÀNH': return order.status === 'COMPLETED' || order.status === 'RECEIVE';
      case 'ĐÃ HỦY': return order.status === 'CANCELLED' || order.status.includes('REFUND');
      default: return true;
    }
  });

  // 🔥 ĐÃ FIX 2: SẮP XẾP ĐƠN HÀNG MỚI NHẤT LÊN ĐẦU
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // GIAO DIỆN 1: ĐANG TẢI (KHI CHECK AUTH)
  if (isInitializing || authLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Spinner className="h-8 w-8 mb-4 text-primary" />
        <p className="text-muted-foreground animate-pulse">Đang đồng bộ dữ liệu...</p>
      </div>
    );
  }

  // GIAO DIỆN 2: CHƯA ĐĂNG NHẬP
  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center pb-2">
            <ShoppingBag className="w-12 h-12 mx-auto text-blue-600 mb-4 opacity-80" />
            <CardTitle className="text-2xl">Đơn hàng của bạn</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Vui lòng đăng nhập để theo dõi trạng thái các đơn hàng bạn đã mua nhé!
            </p>
            <Button onClick={() => router.push(ROUTES.LOGIN)} className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700">
              Đăng nhập ngay
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // GIAO DIỆN 3: LỖI GỌI API
  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center">
        <p className="text-red-500 font-medium bg-red-50 p-4 rounded-lg inline-block border border-red-100">
          Có lỗi xảy ra khi tải danh sách đơn hàng. Vui lòng thử lại sau!
        </p>
      </div>
    );
  }

  // GIAO DIỆN CHÍNH: LỊCH SỬ ĐƠN HÀNG
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
            <ShoppingBag size={24} />
          </div>
          Lịch sử đơn hàng
        </h1>
        
        {/* Khung tìm kiếm mã đơn */}
        <div className="relative w-full sm:w-72 shadow-sm rounded-lg">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Tìm mã đơn (VD: c9017...)" 
            className="pl-9 h-10 bg-white border-gray-200 focus-visible:ring-blue-500"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
        </div>
      </div>

      {/* Thanh Tabs */}
      <div className="flex overflow-x-auto border-b mb-6 no-scrollbar bg-white rounded-t-xl px-2 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap py-3 px-5 text-sm font-bold border-b-[3px] transition-all duration-200 ${
              activeTab === tab 
                ? 'border-blue-600 text-blue-700' 
                : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Danh sách đơn hàng */}
      <div className="space-y-4">
        {ordersLoading ? (
          // Khung xương lúc loading
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-gray-100 rounded-2xl p-5 space-y-4 bg-white shadow-sm">
              <Skeleton className="h-6 w-1/3 rounded-lg" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))
        ) : sortedOrders.length === 0 ? (
          // Trạng thái trống
          <div className="py-24 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <PackageX size={40} className="text-gray-300" />
            </div>
            <p className="text-xl font-bold text-gray-700 mb-2">Chưa có đơn hàng nào!</p>
            <p className="text-gray-500 mb-6 max-w-sm">
              {searchCode || activeTab !== 'TẤT CẢ' 
                ? 'Không tìm thấy đơn hàng nào khớp với bộ lọc hiện tại của bạn.'
                : 'Bạn chưa phát sinh giao dịch nào. Hãy khám phá các sản phẩm tuyệt vời của ThapCam nhé!'}
            </p>
            {(searchCode || activeTab !== 'TẤT CẢ') ? (
               <Button onClick={() => { setActiveTab('TẤT CẢ'); setSearchCode(''); }} variant="outline" className="border-gray-300">
                 Xóa bộ lọc
               </Button>
            ) : (
              <Link href={ROUTES.HOME}>
                <Button className="bg-blue-600 hover:bg-blue-700">Tiếp tục mua sắm</Button>
              </Link>
            )}
          </div>
        ) : (
          // Hiển thị Card đơn hàng (Dùng sortedOrders thay vì filteredOrders)
          sortedOrders.map((order: any) => {
            const statusConfig = STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
            
            return (
              <div 
                key={order.id} 
                onClick={() => router.push(ROUTES.ORDER_DETAIL(order.id))}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
              >
                {/* Dải màu trang trí */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusConfig.color.split(' ')[0]}`}></div>

                {/* Header Card */}
                <div className="flex flex-wrap items-center justify-between border-b border-gray-50 pb-4 mb-4 gap-4 pl-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 tracking-wider">
                        Mã ĐH: {order.id}
                      </span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs text-gray-500 font-medium">
                        {new Date(order.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusConfig.color} flex items-center gap-1.5 shadow-sm`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Body Card */}
                <div className="flex items-center justify-between pl-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Tổng tiền thanh toán</p>
                    <p className="text-blue-600 font-bold text-xl tracking-tight">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount || 0)}
                    </p>
                  </div>

                  {/* Nút điều hướng */}
                  <div className="pl-4 flex items-center text-sm font-bold text-blue-600 group-hover:text-blue-800 group-hover:translate-x-1 transition-all">
                    Xem chi tiết <ChevronRight size={18} className="ml-1" />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}