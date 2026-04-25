'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CustomersService } from '@/services/customers.service';
import { springApi, nestApi } from '@/lib/axiosClient'; 
import { Users, Eye, Receipt, Star, ShoppingBag, Package, Calendar, Info } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const ORDER_TABS = ['TẤT CẢ', 'CHỜ XÁC NHẬN', 'ĐÃ THANH TOÁN', 'ĐANG GIAO', 'HOÀN THÀNH', 'ĐÃ HỦY'];

export function CustomersTab() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('TẤT CẢ'); // State quản lý tab đang chọn

  // FETCH TOÀN BỘ KHÁCH HÀNG (NESTJS)
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => CustomersService.getAllCustomers(),
  });

  // FETCH LỊCH SỬ MUA HÀNG (SPRING BOOT)
  const { data: orderStats, isLoading: loadingOrders } = useQuery({
    queryKey: ['user-orders', selectedUser?.id],
    queryFn: async () => {
      const res = await springApi.get(`/admin/orders/user/${selectedUser.id}`);
      return res.data;
    },
    enabled: !!selectedUser, 
  });

  // FETCH LỊCH SỬ ĐÁNH GIÁ (NESTJS)
  const { data: userReviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['user-reviews', selectedUser?.id],
    queryFn: async () => {
      const res = await nestApi.get(`/products/reviews/user/${selectedUser.id}`);
      const rawData = res.data;
      return Array.isArray(rawData) ? rawData : (rawData?.data || rawData?.items || []);
    },
    enabled: !!selectedUser, 
  });

  // LOGIC LỌC VÀ SẮP XẾP ĐƠN HÀNG (DÙNG USEMEMO ĐỂ TỐI ƯU HIỆU NĂNG)
  const filteredOrders = useMemo(() => {
    if (!orderStats?.orders) return [];
    
    // 1. DESC (Mới nhất lên đầu)
    let list = [...orderStats.orders].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 2. Lọc theo Tab
    if (activeTab === 'TẤT CẢ') return list;
    
    return list.filter((order: any) => {
      switch (activeTab) {
        case 'CHỜ XÁC NHẬN': return order.status === 'PENDING';
        case 'ĐÃ THANH TOÁN': return order.status === 'PAID';
        case 'ĐANG GIAO': return order.status === 'SHIPPING' || order.status === 'DELIVERY';
        case 'HOÀN THÀNH': return order.status === 'COMPLETED' || order.status === 'RECEIVE';
        case 'ĐÃ HỦY': return order.status === 'CANCELLED' || order.status.includes('REFUND');
        default: return true;
      }
    });
  }, [orderStats, activeTab]);

  const customers = Array.isArray(usersData) ? usersData : (usersData as any)?.items || [];
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('userId');
    const targetOrderId = params.get('orderId');

    // Nếu trên URL có mã Khách hàng + Data khách đã tải xong + Popup chưa bật
    if (targetUserId && customers.length > 0 && !selectedUser) {
      const foundUser = customers.find((u: any) => u.id === targetUserId);
      if (foundUser) {
        setSelectedUser(foundUser); // Bật popup
        if (targetOrderId) {
          setTimeout(() => {
            const orderElement = document.getElementById(`order-row-${targetOrderId}`);
            if (orderElement) {
              orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 800); 
        }
        router.replace('/admin?tab=customers', { scroll: false });
      }
    }
  }, [customers, searchParams]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner className="w-10 h-10" /></div>;
  }

  return (
    
    <Card className="border-none shadow-none relative">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl">Quản lý Khách hàng</CardTitle>
        <CardDescription>
          Hệ thống đang có tổng cộng <strong className="text-black">{customers.length}</strong> thành viên.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-0 border rounded-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Thông tin Khách hàng</TableHead>
                <TableHead>Email / Liên hệ</TableHead>
                <TableHead className="text-center">Vai trò</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-right">Ngày tham gia</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.profile?.avatar_url || user.avatar_url} alt={user.full_name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {(user.full_name || user.username || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold">{user.full_name || user.username}</span>
                        <span className="text-xs text-muted-foreground font-mono truncate w-32">{user.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{user.email}</div>
                    {user.profile?.phone_number && <div className="text-xs text-muted-foreground mt-0.5">📞 {user.profile.phone_number}</div>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className={user.role === 'ADMIN' ? 'bg-red-100 text-red-800 hover:bg-red-100' : ''}>
                      {user.role || 'CUSTOMER'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={user.status !== 'INACTIVE' ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}>
                      {user.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(user.created_at || Date.now()).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedUser(user)}>
                      <Eye className="w-5 h-5 text-blue-600 hover:text-blue-800" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Sheet open={!!selectedUser} onOpenChange={(open) => { if(!open) { setSelectedUser(null); setActiveTab('TẤT CẢ'); } }}>
        <SheetContent className="w-[95vw] sm:max-w-3xl overflow-y-auto bg-slate-50 pb-20">
          <SheetHeader className="mb-6 pb-4 border-b border-slate-200">
            <SheetTitle className="text-2xl flex items-center gap-2">
              <Avatar className="h-10 w-10 border shadow-sm">
                <AvatarImage src={selectedUser?.profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {(selectedUser?.full_name || selectedUser?.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              Hồ sơ: <span className="text-blue-700">{selectedUser?.full_name || selectedUser?.username}</span>
            </SheetTitle>
            <SheetDescription>
              Email: <strong>{selectedUser?.email}</strong> | SĐT: <strong>{selectedUser?.profile?.phone_number || 'Chưa cập nhật'}</strong>
            </SheetDescription>
          </SheetHeader>

          {loadingOrders || loadingReviews ? (
            <div className="flex justify-center py-10"><Spinner className="w-8 h-8" /></div>
          ) : (
            <div className="space-y-8">
              
              {/* KHU VỰC 1: TỔNG QUAN CHỈ SỐ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-blue-100 bg-blue-50/50 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Receipt size={24} /></div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium">Tổng chi tiêu</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(orderStats?.totalSpent || 0)}
                      </p>
                      <p className="text-[10px] text-blue-500 mt-1 flex items-center gap-1 font-medium">
                        <Info size={12} /> *Chỉ tính đơn PAID / COMPLETED
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-100 bg-orange-50/50 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-full"><ShoppingBag size={24} /></div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Tổng số đơn</p>
                      <p className="text-2xl font-bold text-orange-700">{orderStats?.totalOrders || 0} đơn hàng</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* KHU VỰC 2: LỊCH SỬ MUA HÀNG + TABS LỌC */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                    <Package className="w-5 h-5 text-blue-600" /> Lịch sử mua hàng
                  </h3>
                  
                  {/* THANH TABS LỌC TRẠNG THÁI */}
                  <div className="flex overflow-x-auto no-scrollbar bg-white p-1 rounded-lg border border-slate-200">
                    {ORDER_TABS.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`whitespace-nowrap px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          activeTab === tab 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                
                {filteredOrders.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-dashed border-slate-300">
                    <Package className="w-10 h-10 text-slate-200 mb-2" />
                    <p className="text-sm text-slate-400 italic">Không tìm thấy đơn hàng nào ở trạng thái này.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order: any) => {
                      const targetOrderId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('orderId') : null;
                      const isTarget = targetOrderId === order.id;

                      return (
                        <div 
                          key={order.id} 
                          id={`order-row-${order.id}`} 
                          className={`bg-white rounded-xl border transition-all duration-500 overflow-hidden ${
                            isTarget ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.01]' : 'border-slate-200 shadow-sm hover:border-blue-300'
                          }`}
                        >
                          <div className="bg-slate-50/50 border-b px-4 py-3 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <Badge variant="outline" className="bg-white font-mono text-xs text-slate-500">
                                #{order.id.split('-')[0]}
                              </Badge>
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(order.createdAt).toLocaleString('vi-VN')}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-blue-600 text-sm">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount || 0)}
                              </span>
                              <Badge className={`text-[10px] px-2 py-0.5 ${
                                order.status === 'COMPLETED' || order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                order.status === 'CANCELLED' || order.status.includes('REFUND') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {order.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="p-4 bg-white">
                            <ul className="space-y-3">
                              {order.items?.map((item: any) => (
                                <li key={item.id} className="flex items-start justify-between gap-4 text-sm border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800 line-clamp-1">{item.productName || 'Sản phẩm ' + item.productId.substring(0,8)}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {item.variantId ? `Phân loại: ${item.variantId.substring(0,8)}...` : 'Bản tiêu chuẩn'}
                                    </p>
                                  </div>
                                  <div className="text-right whitespace-nowrap">
                                    <p className="text-slate-600 text-[11px]">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.priceAtBuy || 0)} x {item.quantity}</p>
                                    <p className="font-semibold text-slate-800">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((item.priceAtBuy || 0) * item.quantity)}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* KHU VỰC 3: LỊCH SỬ ĐÁNH GIÁ */}
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-slate-800">
                  <Star className="w-5 h-5 text-yellow-500" /> Lịch sử Đánh giá
                </h3>
                {(!userReviews || userReviews.length === 0) ? (
                  <p className="text-sm text-muted-foreground italic bg-white p-4 rounded-lg border border-dashed">Chưa có đánh giá nào.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {userReviews.map((rv: any) => (
                      <div key={rv.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-yellow-500 text-lg tracking-widest">
                            {'★'.repeat(rv.rating)}<span className="text-slate-200">{'★'.repeat(5 - rv.rating)}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                            {rv.createdAt || rv.created_at ? new Date(rv.createdAt || rv.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 font-medium mb-1">
                           Sản phẩm: {rv.product?.name || rv.productId}
                        </div>
                        <p className="text-slate-700 italic">"{rv.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}