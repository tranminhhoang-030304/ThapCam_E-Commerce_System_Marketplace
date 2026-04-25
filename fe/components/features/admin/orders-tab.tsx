'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrdersService } from '@/services/orders.service';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Eye, MapPin, User, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Star } from 'lucide-react';
import { nestApi } from '@/lib/axiosClient';

// Hàm helper để tô màu Badge cho đẹp
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING': return <Badge variant="outline" className="text-slate-500 bg-slate-100">Chờ thanh toán</Badge>;
    case 'PAID': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Đã thanh toán</Badge>;
    case 'SHIPPING': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Đang giao hàng</Badge>;
    case 'COMPLETED': return <Badge className="bg-slate-900 text-white hover:bg-slate-800">Hoàn thành</Badge>;
    case 'CANCELLED': return <Badge variant="destructive">Đã hủy</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

export function OrdersTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // THÊM STATE PHÂN TRANG (Mặc định trang 0 cho Spring Boot)
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20; // Số lượng đơn 1 trang

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['admin-orders', currentPage, statusFilter],
    queryFn: () => OrdersService.getAllOrders({ 
        page: currentPage, 
        size: pageSize, 
        // Nếu chọn "ALL" thì truyền undefined để url không bị kẹp thêm ?status= 
        status: statusFilter === 'ALL' ? undefined : statusFilter 
    }), 
  });

  const { data: orderUserReviews } = useQuery({
    queryKey: ['user-reviews-for-order', selectedOrder?.userId],
    queryFn: async () => {
      // Gọi API lấy review dựa trên userId của cái đơn đang được chọn
      const res = await nestApi.get(`/products/reviews/user/${selectedOrder.userId}`);
      const rawData = res.data;
      return Array.isArray(rawData) ? rawData : (rawData?.data || rawData?.items || []);
    },
    enabled: !!selectedOrder?.userId, // Chỉ gọi khi đã bấm mở 1 đơn hàng
  });
  const responseData = ordersResponse as any;
  const ordersList = responseData?.data || responseData?.content || responseData?.items || (Array.isArray(ordersResponse) ? ordersResponse : []);
  
  // LOGIC TÍNH TOÁN 5 SỐ TRANG GẦN NHẤT
  const totalPages = responseData?.totalPages || 1;
  const actualCurrentPage = responseData?.number !== undefined ? responseData?.number : currentPage;
  
  let startPage = Math.max(0, actualCurrentPage - 2);
  let endPage = Math.min(totalPages - 1, actualCurrentPage + 2);
  if (endPage - startPage < 4) {
    if (startPage === 0) endPage = Math.min(totalPages - 1, startPage + 4);
    else if (endPage === totalPages - 1) startPage = Math.max(0, endPage - 4);
  }
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  // 2. Mutation cập nhật trạng thái đơn hàng
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => 
      OrdersService.updateOrderStatus(id, { status: status as any }),
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái đơn hàng');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => toast.error('Cập nhật thất bại!'),
  });

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  // 3. Lọc client-side (Đề phòng backend chưa hỗ trợ lọc status qua params)
  const filteredOrders = ordersList.filter((order: any) => {
    if (statusFilter === 'ALL') return true;
    return order.status === statusFilter;
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Đang tải danh sách đơn hàng...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản lý Đơn hàng</h2>
          <p className="text-muted-foreground">
            Hệ thống đang có tổng cộng <span className="font-bold text-slate-900">{responseData?.totalElements || filteredOrders.length}</span> đơn hàng.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(0); }}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value="PENDING">Chờ thanh toán</SelectItem>
              <SelectItem value="PAID">Đã thanh toán (Cần giao)</SelectItem>
              <SelectItem value="SHIPPING">Đang giao hàng</SelectItem>
              <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
              <SelectItem value="CANCELLED">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[280px]">Mã đơn / Ngày đặt</TableHead>
              <TableHead>Thông tin Người mua</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-right pr-6">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order: any) => (
              <TableRow key={order.id}>
                
                {/* HIỂN THỊ FULL MÃ ĐƠN HÀNG */}
                <TableCell>
                  <div className="font-mono text-xs text-slate-600 mb-1 break-all">
                    #{order.id}
                  </div>
                  <div className="text-sm font-medium text-slate-800">
                    {order.createdAt ? format(new Date(order.createdAt), 'HH:mm - dd/MM/yyyy') : 'N/A'}
                  </div>
                </TableCell>

                {/* CỘT 2: THÔNG TIN KHÁCH HÀNG */}
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <User className="w-4 h-4 text-slate-400" />
                      {/* Gọi thẳng userFullName từ DTO */}
                      <span className="break-all font-mono text-xs text-slate-600" title={order.userFullName || order.userEmail || order.userId}>
                        {order.userFullName || order.userEmail || order.userId || 'Khách vãng lai'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground line-clamp-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      {order.shippingAddress || 'Không có địa chỉ'}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-right font-bold text-red-600">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount)}
                </TableCell>

                <TableCell className="text-center">
                  {getStatusBadge(order.status)}
                </TableCell>

                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={() => setSelectedOrder(order)} title="Xem chi tiết đơn hàng">
                      <Eye className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Select value={order.status} onValueChange={(val) => handleStatusChange(order.id, val)} disabled={updateStatusMutation.isPending}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Chờ thanh toán</SelectItem>
                        <SelectItem value="PAID">Đã thanh toán</SelectItem>
                        <SelectItem value="SHIPPING">Đang giao hàng</SelectItem>
                        <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                        <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredOrders.length === 0 && (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Không tìm thấy đơn hàng nào.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>

        {/* KHU VỰC PHÂN TRANG */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 py-3 bg-slate-50 gap-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>Trang <span className="font-bold text-slate-900">{actualCurrentPage + 1}</span> / {totalPages}</span>
              <span className="text-slate-300">|</span>
              <span>Tổng: <span className="font-bold text-slate-900">{responseData?.totalElements || filteredOrders.length}</span> đơn</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Nút Về Trang Đầu */}
              <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setCurrentPage(0)} disabled={actualCurrentPage === 0} title="Trang đầu tiên">
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              
              {/* NÚT LÙI 5 TRANG */}
              <Button variant="outline" className="h-8 px-2 text-xs font-bold text-slate-500 hover:text-slate-900" onClick={() => setCurrentPage(p => Math.max(0, p - 5))} disabled={actualCurrentPage === 0} title="Lùi 5 trang">
                -5
              </Button>

              {/* Nút Lùi 1 Trang */}
              <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={actualCurrentPage === 0} title="Trang trước">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Cửa sổ 5 trang hiển thị động */}
              {pageNumbers.map(pageNum => (
                <Button 
                  key={pageNum} 
                  variant={pageNum === actualCurrentPage ? "default" : "outline"} 
                  size="sm" 
                  className="h-8 w-8 p-0 font-medium"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum + 1}
                </Button>
              ))}

              {/* Nút Tiến 1 Trang */}
              <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={actualCurrentPage === totalPages - 1} title="Trang sau">
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* NÚT TIẾN 5 TRANG */}
              <Button variant="outline" className="h-8 px-2 text-xs font-bold text-slate-500 hover:text-slate-900" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 5))} disabled={actualCurrentPage === totalPages - 1} title="Tiến 5 trang">
                +5
              </Button>

              {/* Nút Đến Trang Cuối */}
              <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setCurrentPage(totalPages - 1)} disabled={actualCurrentPage === totalPages - 1} title="Trang cuối cùng">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CHI TIẾT SẢN PHẨM KHÔNG BỊ TRÀN TEXT VÀ CHUẨN GIÁ TIỀN */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        {/* Đổi max-w-3xl thành max-w-max và set min-w để nó tự giãn nở */}
        <DialogContent className="max-w-max min-w-[60vw] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Chi tiết đơn hàng: <span className="font-mono text-primary break-all">#{selectedOrder?.id}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="mt-4 space-y-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Thông tin giao hàng
                </h3>
                <p className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground w-24 shrink-0 font-medium">Người mua:</span> 
                  <span className="font-semibold text-slate-900">
                    {selectedOrder?.userFullName || selectedOrder?.userEmail || selectedOrder?.userId || 'Người dùng không xác định'}
                  </span>
                </p>
                <p className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground w-24 shrink-0 font-medium">Địa chỉ:</span> 
                  <span className="text-slate-800 leading-relaxed">{selectedOrder.shippingAddress}</span>
                </p>
                <div className="text-sm flex items-center gap-2 pt-1">
                  <span className="text-muted-foreground w-24 shrink-0 font-medium">Trạng thái:</span> 
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
                  Sản phẩm cần đóng gói
                </h3>
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    {/* Set min-w-[600px] để bảng không bao giờ bị bóp méo */}
                    <Table className="min-w-[600px] w-full">
                      <TableHeader className="bg-slate-100">
                        <TableRow>
                          <TableHead className="py-4 font-semibold text-slate-700">Sản phẩm</TableHead>
                          <TableHead className="text-center py-4 font-semibold text-slate-700">SL</TableHead>
                          <TableHead className="text-right py-4 font-semibold text-slate-700">Đơn giá</TableHead>
                          <TableHead className="text-right py-4 pr-6 font-semibold text-slate-700">Thành tiền</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {selectedOrder.items?.map((item: any) => {
                        // mở F12 (Console) trên trình duyệt lên xem cục data này nhé!
                        console.log("Dữ liệu OrderItem từ Backend trả về:", item);

                        // Thêm các trường hợp backend dùng (amount, productAmount...)
                        const rawPrice = item.priceAtBuy ?? item.price ?? item.unitPrice ?? item.amount ?? item.product?.price ?? item.productAmount ?? 0;
                        const safePrice = Number(rawPrice) || 0;
                        const safeQuantity = Number(item.quantity) || 1;
                        const safeTotal = safePrice * safeQuantity;
                        const matchedReview = orderUserReviews?.find((rv: any) => rv.productId === item.productId);

                        return (
                          <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-medium py-4">
                              <div className="text-slate-900 text-base leading-tight">
                                {item.productName || item.product?.name || 'Sản phẩm không xác định'}
                              </div>
                              {(item.color || item.size || item.variant?.color || item.variant?.size) && (
                                <div className="mt-2">
                                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none hover:bg-blue-50 font-medium">
                                    Phân loại: {[item.color || item.variant?.color, item.size || item.variant?.size].filter(Boolean).join(' - ')}
                                  </Badge>
                                </div>
                              )}
                              {/* HIỂN THỊ SAO NẾU CÓ REVIEW */}
                              {matchedReview && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 bg-yellow-50/50 w-fit px-2 py-1 rounded border border-yellow-100 shadow-sm">
                                  <span className="font-medium">Đánh giá:</span>
                                  <span className="text-yellow-500 tracking-widest text-xs">
                                    {'★'.repeat(matchedReview.rating)}{'☆'.repeat(5 - matchedReview.rating)}
                                  </span>
                                  <span className="text-muted-foreground italic ml-1 line-clamp-1 max-w-[150px]" title={matchedReview.comment}>
                                    "{matchedReview.comment}"
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-4 font-semibold text-slate-700 text-base">
                              {safeQuantity}
                            </TableCell>
                            <TableCell className="text-right py-4 text-slate-600">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(safePrice)}
                            </TableCell>
                            <TableCell className="text-right py-4 pr-6 font-extrabold text-red-600 text-base">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(safeTotal)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}