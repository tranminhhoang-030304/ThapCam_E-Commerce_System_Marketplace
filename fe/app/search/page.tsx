'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ProductsService } from '@/services/products.service';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  // Gọi API lấy sản phẩm dựa trên từ khóa
  const { data: responseData, isLoading } = useQuery({
    queryKey: ['search-products', query],
    queryFn: () => ProductsService.getProducts(1, 20, query, 'active'), // Lấy 20 sản phẩm active
    enabled: !!query,
  });

  const products = responseData?.data || [];
  const meta = responseData?.meta;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Kết quả tìm kiếm cho: <span className="text-primary">"{query}"</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Tìm thấy {meta?.total || products.length} sản phẩm phù hợp.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {products.map((product: any) => (
            <div 
              key={product.id} 
              className="group cursor-pointer border rounded-xl p-3 hover:shadow-md transition-all bg-white"
              onClick={() => router.push(`/products/${product.id}`)}
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 mb-3">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                )}
              </div>
              <h3 className="font-medium text-sm line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              <p className="text-red-600 font-bold mt-2">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed">
          <h3 className="text-lg font-medium text-slate-600">Rất tiếc, không tìm thấy sản phẩm nào!</h3>
          <p className="text-slate-500 mt-1">Hãy thử sử dụng các từ khóa chung chung hơn (VD: Áo, Điện thoại...)</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Đang tải kết quả tìm kiếm...</div>}>
      <SearchContent />
    </Suspense>
  );
}