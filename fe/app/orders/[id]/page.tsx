'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OrdersService } from '@/services/orders.service';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ROUTES } from '@/lib/constants';
import { ArrowLeft, Package, MapPin, Receipt, AlertTriangle } from 'lucide-react'; 

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  // Lấy chi tiết đơn hàng từ Spring Boot
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => OrdersService.getOrderById(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return (status === 'PENDING' || status === 'PAID') ? 3000 : false;
    },
  });

  if (isLoading) {
    return <div className="py-20 text-center"><Spinner className="w-8 h-8 mx-auto" /></div>;
  }

  if (error || !order) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">Không tìm thấy đơn hàng</h2>
        <Button onClick={() => router.push(ROUTES.ORDERS)}>Quay lại danh sách</Button>
      </div>
    );
  }

  // Cờ nhận diện đơn hàng bị thiếu tồn kho
  const isOutOfStock = order.status === 'REFUND_PENDING' || order.status === 'REFUNDED_SUCCESS';

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      {/* NÚT BACK */}
      <Button variant="ghost" onClick={() => router.push(ROUTES.ORDERS)} className="mb-6 -ml-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại Đơn hàng
      </Button>

      {/* HEADER ĐƠN HÀNG */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Chi tiết Đơn hàng</h1>
          <p className="text-muted-foreground font-mono text-sm">Mã ĐH: {order.id}</p>
        </div>
        <Badge
          variant={
            order.status === 'COMPLETED' ? 'default' :
            order.status === 'PAID' ? 'secondary' :
            order.status === 'PENDING' ? 'outline' :
            (order.status === 'CANCELLED' || isOutOfStock) ? 'destructive' : 'default'
          }
          className={`text-sm px-4 py-1.5 
            ${order.status === 'PAID' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
            ${isOutOfStock ? 'bg-red-600 text-white shadow-sm' : ''}
          `}
        >
          {/* Dịch trạng thái lỗi ra tiếng Việt cho dễ hiểu */}
          {isOutOfStock ? 'HẾT HÀNG (CHỜ HOÀN TIỀN)' : order.status}
        </Badge>
      </div>

      {/* HIỂN THỊ BANNER NẾU HẾT HÀNG */}
      {isOutOfStock && (
        <div className={`mt-6 p-6 rounded-xl border ${order.status === 'REFUNDED_SUCCESS' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <h3 className="text-lg font-bold flex items-center gap-2">
            {order.status === 'REFUNDED_SUCCESS' ? '✅ Đã hoàn tiền tự động thành công!' : '⚠️ Giao dịch thành công nhưng kho đã hết hàng!'}
          </h3>
          <p className="mt-2 text-sm">
            {order.status === 'REFUNDED_SUCCESS' 
              ? 'Hệ thống đã hoàn trả 100% số tiền đơn hàng về lại cho bạn. Vui lòng kiểm tra email (hoặc hòm thư thông báo) để biết thêm chi tiết. Rất xin lỗi bạn về sự bất tiện này!'
              : 'Thật xin lỗi bạn, sản phẩm bạn đặt vừa hết hàng trong kho. Hệ thống đã ghi nhận thanh toán và đang tự động xử lý hoàn tiền lại cho bạn trong vòng 24h.'}
          </p>
        </div>
      )}

      {/* Cập nhật Badge Status ở góc phải */}
      <div className="flex justify-between items-center mt-8">
         <h1 className="text-3xl font-bold">Chi tiết Đơn hàng</h1>
         <span className={`px-4 py-2 rounded-lg font-bold ${
            order.status === 'REFUNDED_SUCCESS' ? 'bg-gray-200 text-gray-700' : 
            order.status === 'REFUND_PENDING' ? 'bg-red-500 text-white' : 
            order.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
         }`}>
            {order.status === 'REFUNDED_SUCCESS' ? 'ĐÃ HỦY & HOÀN TIỀN' : order.status}
         </span>
      </div>

      {/* BLOCK THÔNG TIN CHUNG */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-muted-foreground" /> Thông tin giao hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-line font-medium">
              {(order as any).shippingAddress || 'Chưa cập nhật địa chỉ'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Receipt className="w-5 h-5 mr-2 text-muted-foreground" /> Thanh toán & Thời gian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ngày đặt:</span>
              <span className="font-medium">
                {new Date(order.createdAt).toLocaleString('vi-VN', { 
                  hour: '2-digit', minute: '2-digit', 
                  day: '2-digit', month: '2-digit', year: 'numeric' 
                })}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t font-bold text-base">
              <span>Tổng cộng:</span>
              <span className={isOutOfStock ? 'text-muted-foreground line-through' : 'text-green-600 text-xl'}>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((order as any).totalAmount)}
              </span>
            </div>
            {/* Chú thích thêm gạch ngang tiền nếu đang hoàn trả */}
            {isOutOfStock && (
              <div className="text-right text-xs text-red-600 font-medium">
                (Sẽ được hoàn trả đầy đủ)
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BẢNG CHI TIẾT SẢN PHẨM */}
      <Card className={isOutOfStock ? 'opacity-80' : ''}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Package className="w-5 h-5 mr-2 text-muted-foreground" /> Sản phẩm đã mua
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-center">Số lượng</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.productName || `Sản phẩm #${item.productId.substring(0,8)}...`}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.priceAtBuy || item.price)}
                    </TableCell>
                    <TableCell className="text-center font-bold">x{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((item.priceAtBuy || item.price) * item.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}