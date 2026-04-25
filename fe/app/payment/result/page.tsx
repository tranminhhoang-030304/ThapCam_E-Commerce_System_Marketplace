'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ShoppingBag, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { PaymentService } from '@/services/payment.service'; 

function PaymentResultContent() {
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý kết quả thanh toán...');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      // 1. Lấy toàn bộ tham số trên URL
      const queryString = searchParams.toString();
      if (!queryString) {
        setStatus('error');
        setMessage('Không tìm thấy thông tin giao dịch.');
        return;
      }

      // 2. Đọc nhanh trạng thái từ Frontend để hiển thị UI sớm
      const vnpResponse = searchParams.get('vnp_ResponseCode');
      const momoResponse = searchParams.get('resultCode');
      const stripeStatus = searchParams.get('stripe_status');
      
      // Lấy mã đơn hàng và Format lại dấu gạch ngang (-) cho chuẩn UUID nếu là VNPAY
      const currentOrderId = searchParams.get('vnp_TxnRef') || searchParams.get('orderId');
      let formattedOrderId = currentOrderId;
      
      if (currentOrderId && !currentOrderId.includes('-') && currentOrderId.length === 32) {
        formattedOrderId = `${currentOrderId.slice(0,8)}-${currentOrderId.slice(8,12)}-${currentOrderId.slice(12,16)}-${currentOrderId.slice(16,20)}-${currentOrderId.slice(20)}`;
      }
      setOrderId(formattedOrderId); // Lưu mã chuẩn vào state để tí truyền vào URL

      const isSuccessLocal = (vnpResponse === '00') || (momoResponse === '0') || (stripeStatus === 'success');

      if (!isSuccessLocal) {
        setStatus('error');
        setMessage('Giao dịch đã bị hủy hoặc thanh toán không thành công.');
        return;
      }

      // 3. Gọi Backend verify lại cho chắc cốp
      try {
        await PaymentService.verifyPaymentReturn(queryString);
        setStatus('success');
        setMessage('Thanh toán thành công! Đơn hàng của bạn đang được xử lý.');
      } catch (error) {
        setStatus('error');
        setMessage('Có lỗi xảy ra khi xác thực giao dịch với hệ thống.');
      }
    };

    processPayment();
  }, [searchParams]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border text-center space-y-6">
        
        {/* TRẠNG THÁI: ĐANG XỬ LÝ */}
        {status === 'loading' && (
          <div className="py-12 flex flex-col items-center space-y-4">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <h2 className="text-xl font-semibold text-slate-700">{message}</h2>
            <p className="text-muted-foreground text-sm">Vui lòng không đóng trình duyệt lúc này...</p>
          </div>
        )}

        {/* TRẠNG THÁI: THÀNH CÔNG */}
        {status === 'success' && (
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Thanh toán thành công!</h2>
              <p className="text-slate-600">{message}</p>
              {orderId && (
                <p className="mt-4 text-sm font-medium bg-slate-100 py-2 px-4 rounded-lg inline-block">
                  Mã đơn hàng: <span className="text-primary">{orderId}</span>
                </p>
              )}
            </div>
            <div className="pt-6 space-y-3">
              
              {/* 🔥 ĐÃ FIX: Chuyển hướng thẳng vào trang Chi tiết đơn hàng */}
              <Link href={`/orders/${orderId}`} className="block">
                <Button className="w-full h-12 text-md rounded-xl" size="lg">
                  <ShoppingBag className="w-5 h-5 mr-2" /> Xem đơn hàng của tôi
                </Button>
              </Link>

              <Link href={ROUTES.HOME} className="block">
                <Button variant="outline" className="w-full h-12 text-md rounded-xl" size="lg">
                  <Home className="w-5 h-5 mr-2" /> Quay lại trang chủ
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* TRẠNG THÁI: THẤT BẠI */}
        {status === 'error' && (
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Thanh toán thất bại</h2>
              <p className="text-slate-600">{message}</p>
            </div>
            <div className="pt-6 space-y-3">
              <Link href={ROUTES.CHECKOUT} className="block">
                <Button className="w-full h-12 text-md rounded-xl bg-slate-900 hover:bg-slate-800" size="lg">
                  <ArrowLeft className="w-5 h-5 mr-2" /> Thử thanh toán lại
                </Button>
              </Link>
              <Link href={ROUTES.HOME} className="block">
                <Button variant="outline" className="w-full h-12 text-md rounded-xl" size="lg">
                  <Home className="w-5 h-5 mr-2" /> Về trang chủ
                </Button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Bắt buộc phải bọc Suspense khi dùng useSearchParams trong Next.js App Router
export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Đang tải dữ liệu...</p>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}