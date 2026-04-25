'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductsService } from '@/services/products.service';
import { CartService } from '@/services/cart.service';
import { ProductCard } from './product-card';
import { useCartUIStore } from '@/stores/cartUIStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { TOAST_MESSAGES, ROUTES } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export function ProductGrid() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { setCartItemCount } = useCartUIStore();

  // Fetch products
  const {
    data: productsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => ProductsService.getProducts(1, 12),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const products: any[] = productsData?.data || [];

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!isAuthenticated) {
        router.push(ROUTES.LOGIN);
        return;
      }
      const selectedProduct = products.find((p: any) => p.id === productId);
      return CartService.addToCart({
        productId,
        productName: selectedProduct?.name,
        price: Number(selectedProduct?.price),
        imageUrl: selectedProduct?.image_url,
        quantity: 1,
      });
    },
    onSuccess: (data: any) => {
      if (!data || !data.items) return;
      // Update cart item count
      const itemCount = data.items.reduce((sum: any, item: any) => sum + item.quantity, 0);
      setCartItemCount(itemCount);
      toast.success(TOAST_MESSAGES.ADD_TO_CART_SUCCESS);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add to cart';
      toast.error(message);
    },
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load products</p>
      </div>
    );
  }
  
  if (!isLoading && products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={addToCartMutation.mutate}
          isLoading={addToCartMutation.isPending}
        />
      ))}
    </div>
  );
}
