'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox'; 
import { useCartUIStore } from '@/stores/cartUIStore';
import { ROUTES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CartService } from '@/services/cart.service';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';

export function CartDrawer() {
  const router = useRouter();
  const { isCartOpen, closeCart, setCartItemCount } = useCartUIStore();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // 1. GỌI API LẤY GIỎ HÀNG
  const { data: cartData, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => CartService.getCart(),
    enabled: isCartOpen && isAuthenticated,
  });

  const cartItems = cartData?.items || [];

  useEffect(() => {
    if (!isCartOpen) return;
    setSelectedItemIds(cartItems.map((item: any) => item.id));
  }, [isCartOpen, cartItems.length]);

  // 2. TÍCH HỢP NÚT XÓA SẢN PHẨM KHỎI GIỎ
  // Đổi input từ productId (string) sang nguyên 1 object item (any)
  const removeMutation = useMutation({
    mutationFn: (item: any) => CartService.removeFromCart(item.productId, item.variantId),
    onSuccess: (data, item) => { // Lúc này thằng item mới tồn tại
      const itemCount = data.items.reduce((sum: any, it: any) => sum + it.quantity, 0);
      setCartItemCount(itemCount);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      
      setSelectedItemIds(prev => prev.filter(id => id !== item.id));
      toast.success("Đã xóa sản phẩm khỏi giỏ!");
    },
    onError: () => toast.error("Lỗi khi xóa sản phẩm!")
  });

  // LOGIC CHECKBOX
  const handleToggleItem = (uniqueId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(uniqueId) 
        ? prev.filter(id => id !== uniqueId)
        : [...prev, uniqueId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemIds.length === cartItems.length) {
      setSelectedItemIds([]); 
    } else {
      setSelectedItemIds(cartItems.map((item: any) => item.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItemIds.length === 0) {
      toast.warning('Vui lòng chọn sản phẩm cần xóa!');
      return;
    }
    
    setIsDeleting(true);
    try {
      let latestCartData;
      // Sửa tên biến 'id' thành 'uniqueId' cho đồng bộ
      for (const uniqueId of selectedItemIds) {
        const itemToDel = cartItems.find((i: any) => i.id === uniqueId);
        if(itemToDel) {
            latestCartData = await CartService.removeFromCart(itemToDel.productId, itemToDel.variantId);
        }
      }
      
      if (latestCartData && latestCartData.items) {
        const itemCount = latestCartData.items.reduce((sum: any, item: any) => sum + item.quantity, 0);
        setCartItemCount(itemCount);
      } else {
        setCartItemCount(0); 
      }
      
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setSelectedItemIds([]); 
      toast.success('Đã dọn dẹp sạch sẽ các sản phẩm!');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi dọn dẹp giỏ hàng!');
    } finally {
      setIsDeleting(false);
    }
  };

  // TÍNH TỔNG TIỀN DỰA TRÊN NHỮNG MÓN ĐÃ CHỌN
  // Đổi điều kiện tính tiền sang item.id cho chính xác tuyệt đối
  const selectedTotal = useMemo(() => {
    return cartItems
      .filter((item: any) => selectedItemIds.includes(item.id))
      .reduce((sum: number, item: any) => sum + (item.itemTotal || (item.product?.price * item.quantity)), 0);
  }, [cartItems, selectedItemIds]);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      closeCart();
      router.push(ROUTES.LOGIN);
      return;
    }
    closeCart();
    
    const queryParams = new URLSearchParams();
    queryParams.set('items', selectedItemIds.join(','));
    router.push(`${ROUTES.CHECKOUT}?${queryParams.toString()}`); 
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={closeCart}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="mb-6 shrink-0">
          <SheetTitle>Shopping Cart</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex justify-center items-center h-40 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto mb-2 space-y-4 pr-2">
              {cartItems.length === 0 ? (
                <EmptyState 
                  icon={ShoppingCart}
                  title="Giỏ hàng trống"
                  description="Bạn chưa có sản phẩm nào trong giỏ hàng. Cùng khám phá các sản phẩm tuyệt vời nhé!"
                  actionLabel="Continue Shopping"
                  actionClick={() => {
                    closeCart();
                    router.push(ROUTES.HOME);
                  }}
                />
              ) : (
                <>
                  {/* THANH CÔNG CỤ */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        id="select-all" 
                        checked={cartItems.length > 0 && selectedItemIds.length === cartItems.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        Chọn tất cả ({cartItems.length})
                      </label>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                      onClick={handleDeleteSelected}
                      disabled={isDeleting || selectedItemIds.length === 0}
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xóa đã chọn'}
                    </Button>
                  </div>

                  {/* DANH SÁCH ITEM CÓ CHECKBOX */}
                  {cartItems.map((item: any) => (
                    <div key={item.id} className={`flex gap-3 border rounded-lg p-3 transition-colors ${selectedItemIds.includes(item.id) ? 'border-primary bg-primary/5' : 'bg-white'}`}>
                      
                      <div className="flex items-center">
                        <Checkbox 
                          checked={selectedItemIds.includes(item.id)}
                          onCheckedChange={() => handleToggleItem(item.id)}
                        />
                      </div>

                      <div className="w-20 h-20 bg-slate-100 rounded-md flex-shrink-0 overflow-hidden border">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No img</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="font-medium text-sm line-clamp-2 leading-tight" title={item.productName}>
                            {item.productName || item.product?.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">SL: {item.quantity}</p>
                          {item.discountNote && (
                            <p className="text-[11px] text-green-600 font-semibold mt-1 bg-green-50 inline-block px-1 rounded">{item.discountNote}</p>
                          )}
                        </div>
                        <p className="font-bold text-red-600 text-sm mt-1">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.finalPrice || item.product?.price)}
                          {(item.originalPrice > item.finalPrice) && (
                            <span className="text-xs text-slate-400 line-through ml-2 font-normal">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.originalPrice)}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeMutation.mutate(item)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* CART FOOTER */}
            {cartItems.length > 0 && (
              <div className="border-t pt-4 pb-2 space-y-4 shrink-0 bg-background">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Đã chọn: <span className="font-bold text-foreground">{selectedItemIds.length}</span> món</span>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Tổng thanh toán</p>
                    <p className="text-xl font-bold text-red-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedTotal)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full h-12 text-md"
                  disabled={selectedItemIds.length === 0}
                >
                  Mua hàng ({selectedItemIds.length})
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}