'use client';

import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
  isLoading?: boolean;
}

export function ProductCard({
  product,
  onAddToCart,
  isLoading = false,
}: ProductCardProps) {
  const router = useRouter();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToCart?.(product.id);
  };

  return (
    <Card
      className="h-full flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => router.push(ROUTES.PRODUCT_DETAIL(product.id))}
    >
      {/* Product Image */}
      <div className="relative overflow-hidden bg-muted h-48 flex items-center justify-center rounded-t-lg">
        {/* ĐỔI images[0] THÀNH image_url */}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground">No Image</div>
        )}
      </div>

      <CardHeader className="flex-1">
        <CardTitle className="line-clamp-2 text-base">{product.name}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs">
          {product.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          {/* Ép kiểu Number đề phòng API NestJS trả về dạng chuỗi Decimal */}
          <div className="text-2xl font-bold">${Number(product.price).toLocaleString()}</div>
          
          {/* ĐỔI stock THÀNH stock_quantity */}
          <div className={`text-sm ${product.stock_quantity > 0 ? 'text-green-600' : 'text-destructive'}`}>
            {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleAddToCart}
          disabled={product.stock_quantity === 0 || isLoading}
          className="w-full"
          size="sm"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
