'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductsService } from '@/services/products.service';
import { CartService } from '@/services/cart.service';
import { useCartUIStore } from '@/stores/cartUIStore';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES, TOAST_MESSAGES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea'; // 🔥 Thêm Textarea
import { toast } from 'sonner';
import { 
  ArrowLeft, Minus, Plus, ShoppingCart, CreditCard, 
  Star, Check // 🔥 Thêm Star, Check cho đánh giá
} from 'lucide-react';
import Link from 'next/link';

interface ProductDetailProps {
  productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { setCartItemCount, toggleCart } = useCartUIStore();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  
  // STATE LƯU TRỮ BIẾN THỂ KHÁCH CHỌN
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // FETCH SẢN PHẨM
  const { data, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => ProductsService.getProductById(productId),
  });

  const product: any = data;

  // XỬ LÝ LOGIC BIẾN THỂ
  const variants = product?.variants || [];
  const hasVariants = variants.length > 0;
  
  const availableColors = useMemo(() => Array.from(new Set(variants.map((v: any) => v.color).filter(Boolean))), [variants]);
  const availableSizes = useMemo(() => Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean))), [variants]);

  const isColorAvailable = (color: string) => {
    if (!selectedSize) return true; 
    return variants.some((v: any) => v.color === color && v.size === selectedSize);
  };

  const isSizeAvailable = (size: string) => {
    if (!selectedColor) return true;
    return variants.some((v: any) => v.size === size && v.color === selectedColor);
  };

  const handleColorSelect = (color: string) => {
    if (selectedColor === color) {
      setSelectedColor(null);
      return;
    }
    setSelectedColor(color);
    if (selectedSize && !variants.some((v: any) => v.color === color && v.size === selectedSize)) {
      setSelectedSize(null);
    }
    setQuantity(1);
  };

  const handleSizeSelect = (size: string) => {
    if (selectedSize === size) {
      setSelectedSize(null);
      return;
    }
    setSelectedSize(size);
    if (selectedColor && !variants.some((v: any) => v.size === size && v.color === selectedColor)) {
      setSelectedColor(null);
    }
    setQuantity(1);
  };

  const exactVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.find((v: any) => 
      (availableColors.length > 0 ? v.color === selectedColor : true) &&
      (availableSizes.length > 0 ? v.size === selectedSize : true)
    );
  }, [variants, selectedColor, selectedSize, availableColors, availableSizes, hasVariants]);

  const displayPrice = exactVariant ? Number(product.price) + Number(exactVariant.price_modifier) : Number(product?.price || 0);
  const displayStock = exactVariant ? exactVariant.stock_quantity : (product?.stock_quantity || 0);

  const isMissingSelection = hasVariants && ((availableColors.length > 0 && !selectedColor) || (availableSizes.length > 0 && !selectedSize));
  const isAddDisabled = isMissingSelection || !exactVariant || displayStock <= 0;

  // LOGIC ADD TO CART
  const actionMutation = useMutation({
    mutationFn: async (type: 'cart' | 'buy') => {
      if (!isAuthenticated) {
        router.push(ROUTES.LOGIN);
        return Promise.reject(new Error('unauthenticated'));
      }
      
      const variantSuffix = exactVariant ? ` - ${exactVariant.color || ''} ${exactVariant.size || ''}`.trim() : '';
      const finalProductName = `${product?.name}${variantSuffix}`;

      return CartService.addToCart({
        productId,
        variantId: exactVariant?.id || undefined,
        productName: finalProductName,
        price: displayPrice,
        imageUrl: product?.image_url,
        quantity,
      });
    },
    onSuccess: (res: any, type) => {
      if (!res || !res.items) return;
      const itemCount = res.items.reduce((sum: any, item: any) => sum + item.quantity, 0);
      setCartItemCount(itemCount);
      queryClient.invalidateQueries({ queryKey: ['cart'] });

      if (type === 'cart') {
        toast.success(TOAST_MESSAGES?.ADD_TO_CART_SUCCESS || 'Đã thêm vào giỏ hàng');
        toggleCart();
      } else if (type === 'buy') {
        router.push('/checkout'); 
      }
    },
    onError: (err: any) => {
      if (err.message === 'unauthenticated') return;
      toast.error(err.response?.data?.message || 'Failed to action');
    },
  });

  const handleQuantityChange = (type: 'increase' | 'decrease') => {
    if (type === 'decrease' && quantity > 1) setQuantity(q => q - 1);
    if (type === 'increase' && quantity < displayStock) setQuantity(q => q + 1);
  };

  if (error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Không tìm thấy sản phẩm</h2>
        <Link href={ROUTES.HOME}>
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2"/> Về trang chủ</Button>
        </Link>
      </div>
    );
  }

  if (isLoading || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* BREADCRUMB */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href={ROUTES.HOME} className="hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Link>
          <span>/</span>
          <Link href={ROUTES.HOME} className="hover:text-primary transition-colors">Sản phẩm</Link>
          {product?.category?.name && (
            <>
              <span>/</span>
              <span className="hover:text-primary transition-colors">{product.category.name}</span>
            </>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* CỘT TRÁI: ẢNH SẢN PHẨM */}
          <div className="space-y-4">
            <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden border flex items-center justify-center relative">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <span className="text-muted-foreground">Chưa có hình ảnh</span>
              )}
              {displayStock <= 0 && !isMissingSelection && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                  <span className="text-white font-bold text-2xl border-4 border-white px-6 py-2 rounded-lg transform -rotate-12">
                    HẾT HÀNG
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN CHI TIẾT */}
          <div className="flex flex-col">
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                {product?.category?.name && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                    {product.category.name}
                  </Badge>
                )}
                {product.sku && <span className="text-xs text-muted-foreground font-mono">SKU: {product.sku}</span>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-900">
                {product.name}
              </h1>
            </div>

            {/* GIÁ TIỀN */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              <div className="flex items-end gap-3">
                <span className="text-4xl font-extrabold text-red-600">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice)}
                </span>
                <span className="text-sm text-slate-500 line-through mb-1">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice * 1.2)}
                </span>
                <Badge variant="destructive" className="mb-1 text-xs">-20%</Badge>
              </div>
            </div>

            {/* KHU VỰC CHỌN BIẾN THỂ */}
            {hasVariants && (
              <div className="mb-6 space-y-5">
                {availableColors.length > 0 && (
                  <div>
                    <span className="font-medium text-slate-700 mb-2 block">
                      Tùy chọn 1: {selectedColor && <span className="text-primary font-bold">{selectedColor}</span>}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {availableColors.map((color: any) => {
                        const isAvailable = isColorAvailable(color);
                        const isSelected = selectedColor === color;
                        return (
                          <button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            className={`px-4 py-2 border rounded-md text-sm font-medium transition-all flex items-center gap-2
                              ${isSelected ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary shadow-sm' : 'bg-white'}
                              ${!isAvailable && !isSelected ? 'opacity-40 border-dashed hover:border-slate-300 text-slate-400' : 'border-slate-200 hover:border-primary/50 text-slate-700'}
                            `}
                          >
                            {color}
                            {isSelected && <Check className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {availableSizes.length > 0 && (
                  <div>
                    <span className="font-medium text-slate-700 mb-2 block">
                      Tùy chọn 2: {selectedSize && <span className="text-primary font-bold">{selectedSize}</span>}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((size: any) => {
                        const isAvailable = isSizeAvailable(size);
                        const isSelected = selectedSize === size;
                        return (
                          <button
                            key={size}
                            onClick={() => handleSizeSelect(size)}
                            className={`min-w-[3rem] px-3 py-2 border rounded-md text-sm font-medium transition-all flex justify-center items-center gap-1
                              ${isSelected ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary shadow-sm' : 'bg-white'}
                              ${!isAvailable && !isSelected ? 'opacity-40 border-dashed hover:border-slate-300 text-slate-400' : 'border-slate-200 hover:border-primary/50 text-slate-700'}
                            `}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isMissingSelection ? (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-100 flex items-center">
                    Vui lòng chọn đầy đủ phân loại sản phẩm trước khi mua.
                  </p>
                ) : (!exactVariant ? (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100 flex items-center">
                    Phân loại này hiện không tồn tại hoặc đã ngừng bán.
                  </p>
                ) : null)}
              </div>
            )}

            {/* CHỌN SỐ LƯỢNG */}
            <div className="flex items-center gap-4 mb-8">
              <span className="font-medium text-slate-700 w-20">Số lượng:</span>
              <div className="flex items-center border rounded-md h-10 w-32">
                <button 
                  onClick={() => handleQuantityChange('decrease')}
                  disabled={quantity <= 1 || actionMutation.isPending || isAddDisabled}
                  className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 h-full flex items-center justify-center border-x font-medium">
                  {quantity}
                </div>
                <button 
                  onClick={() => handleQuantityChange('increase')}
                  disabled={quantity >= displayStock || actionMutation.isPending || isAddDisabled}
                  className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-muted-foreground">
                {isMissingSelection ? "Vui lòng chọn phân loại" : 
                 displayStock > 0 ? `${displayStock} sản phẩm có sẵn` : 
                 <span className="text-destructive font-medium">Tạm thời hết hàng</span>}
              </span>
            </div>

            {/* NÚT ACTION */}
            <div className="flex gap-4 mb-8">
              <Button 
                variant="outline" 
                size="lg" 
                className="flex-1 border-primary text-primary hover:bg-primary/5 h-12"
                onClick={() => actionMutation.mutate('cart')}
                disabled={isAddDisabled || actionMutation.isPending}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {actionMutation.isPending ? 'Đang xử lý...' : 'Thêm vào giỏ'}
              </Button>
              <Button 
                size="lg" 
                className="flex-1 h-12 text-md"
                onClick={() => actionMutation.mutate('buy')}
                disabled={isAddDisabled || actionMutation.isPending}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Mua ngay
              </Button>
            </div>
          </div>
        </div>

        {/* GỌI COMPONENT ĐÁNH GIÁ VÀO ĐÂY! */}
        <ReviewForm productId={productId} />

      </div>
    </div>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      return ProductsService.submitReview(productId, { rating, comment });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success("Cảm ơn bạn đã đánh giá sản phẩm!");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!");
    }
  });

  const handleSubmit = () => {
    submitReviewMutation.mutate(); 
  };

  if (isSubmitted) {
    return (
      <div className="mt-12 p-8 border rounded-2xl bg-green-50 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-2">Đánh giá thành công!</h3>
        <p className="text-green-600">Cảm ơn bạn đã đóng góp ý kiến để ThapCam phát triển hơn.</p>
      </div>
    );
  }

  return (
    <div className="mt-12 p-6 md:p-8 border border-slate-100 rounded-2xl bg-white shadow-sm">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Star className="text-yellow-400 fill-yellow-400" /> Đánh giá Sản phẩm này
      </h3>
      
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} onClick={() => setRating(star)} className="focus:outline-none hover:scale-110 transition-transform">
            <Star size={36} className={rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200 fill-slate-50'} />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {rating === 5 ? (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-5 rounded-xl">
              <p className="font-bold text-emerald-800 text-lg flex items-center gap-2 mb-1">
                🎉 Tuyệt vời quá!
              </p>
              <p className="text-emerald-700 text-sm">
                Tặng bạn mã Voucher <strong className="bg-emerald-200 px-2 py-1 rounded text-emerald-900">THAPCAM50</strong> giảm 50K cho đơn hàng tiếp theo!
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100">
              Xin lỗi vì trải nghiệm chưa hoàn hảo. ThapCam có thể làm gì để phục vụ bạn tốt hơn?
            </p>
          )}

          <Textarea 
            placeholder={rating === 5 ? "Bạn thích nhất điều gì ở sản phẩm này? Chia sẻ ngay nhé..." : "Vui lòng mô tả chi tiết vấn đề bạn gặp phải..."}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[120px] resize-none bg-slate-50 focus-visible:ring-blue-500"
          />
          
          <Button onClick={handleSubmit} disabled={!comment.trim()} className="bg-slate-900 hover:bg-slate-800 w-full sm:w-auto px-8">
            {submitReviewMutation.isPending ? 'Đang gửi đánh giá...' : 'Đã gửi đánh giá'}
          </Button>
        </div>
      )}
    </div>
  );
}