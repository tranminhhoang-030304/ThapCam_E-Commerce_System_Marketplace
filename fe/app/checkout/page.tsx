'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CartService } from '@/services/cart.service';
import { OrdersService } from '@/services/orders.service';
import { ProfileService } from '@/services/profile.service';
import { useAuth } from '@/hooks/useAuth';
import { useCartUIStore } from '@/stores/cartUIStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { toast } from 'sonner';
import { ROUTES } from '@/lib/constants';
import { springApi } from '@/lib/axiosClient';
import { Ticket, X, Check } from 'lucide-react';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { setCartItemCount } = useCartUIStore();
  const queryClient = useQueryClient();
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'MOMO' | 'VNPAY' | 'STRIPE'>('COD');
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  const selectedItemIdsParam = searchParams.get('items');
  const voucherFromUrl = searchParams.get('voucherCode');
  
  const selectedItemIds = useMemo(() => {
    return selectedItemIdsParam ? selectedItemIdsParam.split(',') : [];
  }, [selectedItemIdsParam]);

  const { data: cartData, isLoading: isCartLoading } = useQuery({
    queryKey: ['cart', user?.id], 
    queryFn: () => CartService.getCart(),
    enabled: isAuthenticated,
  });

  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: ProfileService.getProfile,
    enabled: isAuthenticated,
  });

  const checkoutItems = useMemo(() => {
    if (!cartData) return [];
    if (selectedItemIds.length > 0) {
      return cartData.items.filter((item: any) => {
        const itemKey = item.variantId 
          ? `${item.productId}-${item.variantId}` 
          : item.productId;
        return selectedItemIds.includes(itemKey) || selectedItemIds.includes(item.id);
      });
    }
    return cartData.items;
  }, [cartData, selectedItemIds]);

  // TIỀN GỐC
  const checkoutTotal = useMemo(() => {
    return checkoutItems.reduce((sum: number, item: any) => {
      return sum + (item.itemTotal || (Number(item.price || item.product?.price || 0) * item.quantity));
    }, 0);
  }, [checkoutItems]);

  useEffect(() => {
    if (voucherFromUrl && checkoutTotal > 0 && !appliedVoucher && !isApplyingVoucher) {
      handleApplyVoucher(voucherFromUrl); // Ném thẳng mã từ URL vào đây
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherFromUrl, checkoutTotal]);

  const { data: availableVouchers } = useQuery({
    queryKey: ['available-vouchers', user?.id, (user as any)?.sub, checkoutTotal],
    queryFn: async () => {
      // Lấy ID từ id hoặc sub đều được
      const currentUserId = user?.id || (user as any)?.sub; 
      // Nếu không có ID hoặc chưa có tiền -> Không gọi API
      if (!currentUserId || checkoutTotal === 0) return [];
      const res = await springApi.get(`/vouchers/available?userId=${currentUserId}&orderValue=${checkoutTotal}`);
      return res.data;
    },
    enabled: isAuthenticated && checkoutTotal > 0,
  });

  useEffect(() => {
    if (profile?.address && !address) {
      setAddress(profile.address);
    }
  }, [profile, address]);
  
  // TÍNH TIỀN GIẢM GIÁ
  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    let amt = 0;
    if (appliedVoucher.discountType === 'FIXED_AMOUNT') {
      amt = appliedVoucher.discountValue;
    } else if (appliedVoucher.discountType === 'PERCENTAGE') {
      amt = (checkoutTotal * appliedVoucher.discountValue) / 100;
      if (appliedVoucher.maxDiscountAmount && amt > appliedVoucher.maxDiscountAmount) {
        amt = appliedVoucher.maxDiscountAmount;
      }
    }
    return amt > checkoutTotal ? checkoutTotal : amt; // Không cho âm tiền
  }, [appliedVoucher, checkoutTotal]);

  const finalTotal = checkoutTotal - discountAmount;

  // HÀM KIỂM TRA MÃ GIẢM GIÁ
  const handleApplyVoucher = async (codeToApply?: string) => {
    // Ưu tiên mã truyền vào, nếu không có mới lấy từ ô input
    const code = (codeToApply || voucherInput).trim(); 
    
    if (!code) return;
    setIsApplyingVoucher(true);
    try {
      const res = await springApi.get(`/vouchers/validate?code=${code}&orderValue=${checkoutTotal}`);
      setAppliedVoucher(res.data);
      if (codeToApply) setVoucherInput(code); // Tự động fill chữ vào ô Input cho đẹp
      toast.success('Áp dụng mã giảm giá thành công!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ!');
      setAppliedVoucher(null);
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!address.trim()) throw new Error('Vui lòng nhập địa chỉ giao hàng!');
      if (checkoutItems.length === 0) throw new Error('Không có sản phẩm nào để thanh toán!');
      
      // 🔥 Bơm thêm voucherCode vào payload
      const order = await OrdersService.createOrder({ 
          items: checkoutItems,
          shippingAddress: address,
          voucherCode: appliedVoucher?.code || null // Thêm dòng này
      } as any); 

      if (paymentMethod === 'COD') {
        return { type: 'COD', payload: order.id };
      } else if (paymentMethod === 'STRIPE') {
        const stripeRes = await springApi.post(`/payment/stripe/create-session/${order.id}`);
        return { type: 'ONLINE', payload: stripeRes.data.url };
      } else {
        const paymentRes = await springApi.get(`/payment/create_url?orderId=${order.id}&method=${paymentMethod}`);
        return { type: 'ONLINE', payload: paymentRes.data.url }; 
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (result.type === 'COD') {
        toast.success('Đặt hàng thành công!');
        router.push(`/orders/${result.payload}`);
      } else {
        toast.success('Đang chuyển hướng sang cổng thanh toán...');
        window.location.href = result.payload; 
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Lỗi khi đặt hàng!');
    }
  });

  if (isCartLoading) return <div className="p-16 text-center">Đang tải giỏ hàng...</div>;
  
  if (checkoutItems.length === 0) {
    return (
      <div className="p-16 text-center">
        <h2 className="text-xl font-medium mb-4">Không có sản phẩm nào được chọn để thanh toán!</h2>
        <Button onClick={() => router.push(ROUTES.HOME)} variant="outline">Quay lại mua sắm</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Thanh Toán (Checkout)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Thông tin giao hàng
            </h2>
            <Field>
              <FieldLabel>Địa chỉ nhận hàng (*)</FieldLabel>
              <Input 
                placeholder="Nhập địa chỉ của bạn (VD: 123 Đường ABC, Hà Nội)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-12"
              />
            </Field>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              Phương thức thanh toán
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                className={`border-2 p-4 rounded-xl cursor-pointer flex items-center justify-center text-center transition-all ${
                  paymentMethod === 'COD' ? 'border-green-500 bg-green-50 text-green-700 font-bold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('COD')}
              >
                Thanh toán khi nhận hàng (COD)
              </div>
              <div 
                className={`border-2 p-4 rounded-xl cursor-pointer flex items-center justify-center text-center transition-all ${
                  paymentMethod === 'MOMO' ? 'border-pink-500 bg-pink-50 text-pink-700 font-bold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('MOMO')}
              >
                Ví điện tử MoMo
              </div>
              <div 
                className={`border-2 p-4 rounded-xl cursor-pointer flex items-center justify-center text-center transition-all ${
                  paymentMethod === 'VNPAY' ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('VNPAY')}
              >
                Cổng thanh toán VNPAY
              </div>
              <div 
                className={`border-2 p-4 rounded-xl cursor-pointer flex items-center justify-center text-center transition-all ${
                  paymentMethod === 'STRIPE' ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setPaymentMethod('STRIPE')}
              >
                Thẻ Quốc tế (Stripe)
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="border p-6 rounded-2xl bg-slate-50/50 sticky top-24 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Tóm tắt đơn hàng ({checkoutItems.length} sản phẩm)</h2>
            
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              {checkoutItems.map((item: any) => {
                const itemPrice = Number(item.price || item.product?.price || 0);
                return (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-16 h-16 bg-white rounded-md border flex-shrink-0 overflow-hidden">
                      {item.product?.image_url ? (
                        <img src={item.product.image_url} alt={item.product?.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No img</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{item.productName || item.product?.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">Số lượng: {item.quantity}</p>
                      {item.discountNote && (
                        <p className="text-[11px] text-green-600 font-medium mt-1">{item.discountNote}</p>
                      )}
                    </div>
                    <div className="font-semibold text-sm flex flex-col items-end">
                      {/* GIÁ SAU GIẢM */}
                      <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.itemTotal || (item.finalPrice * item.quantity))}</span>
                      {/* GIÁ GỐC GẠCH NGANG */}
                      {(item.originalPrice > item.finalPrice) && (
                        <span className="text-xs text-slate-400 line-through font-normal">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.originalPrice * item.quantity)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* KHU VỰC NHẬP MÃ GIẢM GIÁ */}
            <div className="mt-6 pt-4 border-t border-dashed border-slate-300">
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-blue-600" /> Mã khuyến mãi
              </label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Nhập mã (VD: TET2026)" 
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  disabled={!!appliedVoucher}
                  className="bg-white"
                />
                {/* 🔥 KHU VỰC ĐỀ XUẤT VOUCHER (FIX LỖI TRÀN KHUNG -> CHUYỂN SANG XUỐNG DÒNG) */}
                {availableVouchers && availableVouchers.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs text-slate-500 mb-3 font-medium flex items-center gap-1.5">
                      <span className="text-amber-500 text-lg leading-none">★</span> Voucher khả dụng cho bạn:
                    </p>
                    
                    {/* 🔥 THAY overflow-x-auto THÀNH flex-wrap ĐỂ TỰ ĐỘNG XUỐNG DÒNG */}
                    <div className="flex flex-wrap gap-3">
                      {availableVouchers.map((v: any) => {
                        const isApplied = appliedVoucher?.code === v.code;
                        return (
                          <div 
                            key={v.id} 
                            onClick={() => {
                              if (isApplied) {
                                setAppliedVoucher(null); 
                                setVoucherInput('');
                              } else {
                                handleApplyVoucher(v.code);
                              }
                            }}
                            // 🔥 Điều chỉnh w-[calc(50%-6px)] để xếp 2 cột đều nhau, flex-grow để tự điền hàng lẻ
                            className={`relative border-2 px-3 py-2.5 rounded-xl cursor-pointer flex-grow w-[calc(50%-6px)] sm:w-[calc(50%-6px)] md:w-auto min-w-[140px] max-w-[180px] transition-all shadow-sm group
                              ${isApplied 
                                ? 'border-green-500 bg-green-50 shadow-green-100' 
                                : 'border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'}`}
                          >
                            {/* Dấu tick nổi */}
                            {isApplied && (
                              <div className="absolute -top-2.5 -right-2.5 bg-green-500 text-white rounded-full p-1 shadow-md border-2 border-white">
                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1.5 mb-1">
                              <Ticket className={`w-3.5 h-3.5 ${isApplied ? 'text-green-600' : 'text-blue-500 group-hover:text-blue-700'}`} />
                              <p className={`font-bold text-sm ${isApplied ? 'text-green-700' : 'text-blue-700 group-hover:text-blue-800'}`}>
                                {v.code}
                              </p>
                            </div>
                            
                            <p className={`text-[11px] font-medium ${isApplied ? 'text-green-600' : 'text-slate-600'}`}>
                              Giảm {v.discountType === 'PERCENTAGE' 
                                ? `${v.discountValue}%` 
                                : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.discountValue)}
                            </p>
                            
                            <div className={`mt-2 pt-1.5 border-t border-dashed ${isApplied ? 'border-green-200' : 'border-slate-200'}`}>
                              <p className={`text-[10px] font-bold uppercase text-center transition-colors ${isApplied ? 'text-green-600' : 'text-blue-600 opacity-80 group-hover:opacity-100'}`}>
                                {isApplied ? '✅ Đang dùng' : 'Bấm để dùng'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {!appliedVoucher ? (
                  <Button 
                    variant="secondary" 
                    onClick={() => handleApplyVoucher(voucherInput)} //bỏ voucheInput
                    disabled={isApplyingVoucher || !voucherInput.trim()}
                  >
                    {isApplyingVoucher ? 'Đang thử...' : 'Áp dụng'}
                  </Button>
                ) : (
                  <Button 
                    variant="destructive" 
                    onClick={() => { setAppliedVoucher(null); setVoucherInput(''); }}
                    className="px-3"
                    title="Gỡ bỏ mã"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t mt-4 pt-4 space-y-3">
              <div className="flex justify-between text-slate-600 text-sm">
                <span>Tạm tính:</span>
                <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(checkoutTotal)}</span>
              </div>

              {/* HIỂN THỊ TIỀN GIẢM */}
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 text-sm font-medium">
                  <span>Khuyến mãi ({appliedVoucher?.code}):</span>
                  <span>- {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 text-sm">
                <span>Phí vận chuyển:</span>
                <span>Miễn phí</span>
              </div>
              <div className="flex justify-between font-bold text-xl text-slate-900 pt-3 border-t">
                <span>Tổng cộng:</span>
                <span className="text-red-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalTotal)}</span>
              </div>
            </div>

            <Button 
              className={`w-full h-14 text-lg mt-8 rounded-xl shadow-md ${paymentMethod === 'STRIPE' ? 'bg-purple-600 hover:bg-purple-700' : ''}`} 
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending 
                ? 'Đang xử lý...' 
                : paymentMethod === 'COD' 
                  ? 'Đặt hàng ngay' 
                  : `Thanh toán qua ${paymentMethod === 'MOMO' ? 'MoMo' : paymentMethod === 'VNPAY' ? 'VNPAY' : 'Stripe'}`}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-muted-foreground">Đang tải dữ liệu thanh toán...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}