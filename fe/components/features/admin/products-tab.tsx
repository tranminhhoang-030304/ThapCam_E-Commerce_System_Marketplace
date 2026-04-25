'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductsService } from '@/services/products.service';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Search, PackageSearch, Layers, Star, MessageSquare, User } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductFormDialog } from './product-form-dialog';
import { VariantManagerDialog } from './variant-manager-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'next/navigation';

export function ProductsTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reviewProduct, setReviewProduct] = useState<any>(null);
  // STATE TÌM KIẾM & LỌC ĐÃ ĐƯỢC TỐI ƯU
  const [page, setPage] = useState(1);
  const limit = 10;
  const [searchInput, setSearchInput] = useState(''); // Chữ khách đang gõ
  const [searchTerm, setSearchTerm] = useState(''); // Chữ chốt để gọi API
  const [statusFilter, setStatusFilter] = useState('all');
  const [isVariantManagerOpen, setIsVariantManagerOpen] = useState(false);

  // FETCH API
  const { data: responseData, isLoading } = useQuery({
    queryKey: ['admin-products', page, limit, searchTerm, statusFilter],
    queryFn: () => ProductsService.getProducts(
      page, 
      limit, 
      searchTerm || undefined, 
      statusFilter !== 'all' ? statusFilter : undefined
    ),
  });

  const { data: productReviews, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['admin-product-reviews', reviewProduct?.id],
    queryFn: async () => {
      // 1. Lấy data thô từ Service
      const rawData = await ProductsService.getProductReviews(reviewProduct?.id);
      // 2. Chắc chắn trả về một Mảng (Array)
      return Array.isArray(rawData) ? rawData : (rawData?.data || rawData?.items || []);
    },
    enabled: !!reviewProduct, 
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => ProductsService.deleteProduct(id),
    onSuccess: () => {
      toast.success('Xóa sản phẩm thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xóa sản phẩm thất bại');
    },
  });

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  // HÀM XỬ LÝ TÌM KIẾM CHUẨN XÁC
  const executeSearch = () => {
    setSearchTerm(searchInput); // Chốt từ khóa
    setPage(1); // Reset về trang 1
  };

  const products = responseData?.data || [];
  const meta = responseData?.meta;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sản phẩm ({meta?.total || products.length})</h3>
        <Button onClick={() => { setSelectedProduct(null); setIsFormOpen(true); }} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Thêm Sản phẩm
        </Button>
      </div>

      {/* THANH CÔNG CỤ TÌM KIẾM & LỌC */}
      <div className="mb-4 flex gap-4 items-center">
        {/* Đổi form thành div để không bị lỗi reload trang */}
        <div className="flex gap-2 flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm theo tên hoặc SKU..." 
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeSearch()} // Bắt sự kiện Enter
          />
          <Button variant="secondary" onClick={executeSearch}>
            Tìm kiếm
          </Button>
        </div>

        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang bán (Active)</SelectItem>
            <SelectItem value="hidden">Đã ẩn (Hidden)</SelectItem>
            <SelectItem value="draft">Bản nháp (Draft)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hình ảnh</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Tên sản phẩm</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Tồn kho</TableHead>
              <TableHead className="text-center">Đánh giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <div className="py-6 border-0">
                    <EmptyState 
                      icon={PackageSearch}
                      title="Không tìm thấy sản phẩm"
                      description="Rất tiếc, không có sản phẩm nào khớp với từ khóa hoặc bộ lọc của bạn. Hãy thử lại!"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded border" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No img</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.category ? (
                      <Badge variant="outline" className="bg-slate-50">
                        {product.category.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Chưa phân loại</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{product.sku || 'N/A'}</TableCell>
                  <TableCell className="font-medium line-clamp-2 max-w-[200px]" title={product.name}>{product.name}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                  </TableCell>
                  <TableCell>
                    <span className={product.stock_quantity > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {product.stock_quantity}
                    </span>
                  </TableCell>

                  {/* CỘT HIỂN THỊ ĐÁNH GIÁ TRUNG BÌNH (TỰ ĐỘNG TÍNH) */}
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border-none font-medium flex items-center justify-center gap-1 w-fit mx-auto">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      {(() => {
                        // Nếu backend có trả thẳng average_rating thì dùng luôn
                        if (product.average_rating) return Number(product.average_rating).toFixed(1);
                        // Nếu backend trả về mảng reviews thì Frontend tự cộng lại chia đều
                        if (product.reviews && product.reviews.length > 0) {
                          const totalStars = product.reviews.reduce((acc: number, rv: any) => acc + rv.rating, 0);
                          return (totalStars / product.reviews.length).toFixed(1);
                        }
                        // Nếu không có gì thì mới là 0.0
                        return '0.0';
                      })()}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant={product.status === 'active' ? 'default' : product.status === 'hidden' ? 'secondary' : 'outline'}>
                      {product.status?.toUpperCase() || 'DRAFT'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2 min-w-[100px]">

                    {/* NÚT BẤM XEM CHI TIẾT REVIEW */}
                    <Button variant="ghost" size="icon" title="Xem đánh giá của khách" onClick={() => setReviewProduct(product)}>
                      <MessageSquare className="h-4 w-4 text-orange-500" />
                    </Button>
                    
                    <Button variant="ghost" size="icon" title="Quản lý biến thể (Màu/Size)" onClick={() => { setSelectedProduct(product); setIsVariantManagerOpen(true); }}>
                      <Layers className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Sửa sản phẩm"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(product.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* PHÂN TRANG */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Trang {meta.page} / {meta.last_page}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Trước
            </Button>
            <Button variant="outline" size="sm" disabled={page === meta.last_page} onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}>
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* DIALOG XÓA & THÊM/SỬA */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa Sản phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteProductMutation.mutate(deleteId)}
              disabled={deleteProductMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteProductMutation.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <ProductFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} product={selectedProduct} />
      <VariantManagerDialog 
        open={isVariantManagerOpen} 
        onOpenChange={setIsVariantManagerOpen} 
        product={selectedProduct} 
      />

      {/* DIALOG HIỂN THỊ DANH SÁCH REVIEW (MỚI) */}
      <Dialog open={!!reviewProduct} onOpenChange={() => setReviewProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              Đánh giá: {reviewProduct?.name}
            </DialogTitle>
            <DialogDescription>Danh sách phản hồi từ khách hàng cho sản phẩm này.</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {isLoadingReviews ? (
              <div className="flex justify-center py-8"><Spinner className="w-8 h-8" /></div>
            ) : !productReviews || productReviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                Sản phẩm này chưa có đánh giá nào.
              </div>
            ) : (
              <div className="space-y-4">
                {productReviews.map((rv: any) => (
                  <div key={rv.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-yellow-500 text-lg tracking-widest">
                        {'★'.repeat(rv.rating)}<span className="text-slate-200">{'★'.repeat(5 - rv.rating)}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                        {new Date(rv.createdAt || rv.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    
                    {/* THẺ ĐƯỜNG LINK CLICK */}
                    <div 
                      className="text-xs text-blue-600 font-medium mb-2 font-mono cursor-pointer hover:underline flex items-center gap-1 w-fit"
                      onClick={() => {
                        if (!rv.userId) {
                          toast.error('Đánh giá này là dữ liệu cũ, không có ID Khách hàng!');
                          return;
                        }
                        setReviewProduct(null); 
                        router.push(`/admin?tab=customers&userId=${rv.userId}${rv.orderId ? `&orderId=${rv.orderId}` : ''}`);
                      }}
                    >
                      <User className="w-3 h-3" />
                      Khách hàng: {rv.user?.profile?.full_name || rv.user?.username || rv.user?.email || rv.userId?.substring(0, 8)}
                    </div>

                    {/* NỘI DUNG COMMENT NẰM TÁCH BIỆT BÊN NGOÀI */}
                    <p className="text-slate-700 font-medium bg-slate-50 p-3 rounded-lg">"{rv.comment}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}