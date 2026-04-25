'use client';

import { useEffect, useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ProductsService } from '@/services/products.service';
import { CategoriesService } from '@/services/categories.service'; 
import { UploadService } from '@/services/upload.service';
import { useForm, Controller } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; 
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

const productSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(5, 'Description is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  stock_quantity: z.coerce.number().min(0, 'Stock must be non-negative'),
  image_url: z.string().url('Must be a valid URL').or(z.literal('')),
  status: z.enum(['active', 'hidden', 'draft']).default('draft'),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'), // Bắt buộc chọn
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => CategoriesService.getAll(),
  });

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { sku: '', name: '', description: '', price: 0, stock_quantity: 0, image_url: '', status: 'draft', categoryId: '' },
  });

  const currentImageUrl = watch('image_url');

  useEffect(() => {
    if (product) {
      reset({
        ...product,
        sku: product.sku || '',
        status: product.status || 'draft',
        categoryId: product.category?.id || product.categoryId || '', 
      });
    } else {
      reset({ sku: '', name: '', description: '', price: 0, stock_quantity: 0, image_url: '', status: 'draft', categoryId: '' });
    }
  }, [product, reset, open]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await UploadService.uploadImage(file);
      setValue('image_url', url, { shouldDirty: true, shouldValidate: true });
      toast.success('Tải ảnh sản phẩm thành công!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi khi tải ảnh lên!');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const createProductMutation = useMutation({
    mutationFn: (data: ProductFormData) => ProductsService.createProduct(data as any),
    onSuccess: () => {
      toast.success('Thêm sản phẩm thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: (data: ProductFormData) => ProductsService.updateProduct(product.id, data as any),
    onSuccess: () => {
      toast.success('Cập nhật thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });       
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update product');
    },
  });

  const onSubmit = (data: ProductFormData) => {
    if (product) updateProductMutation.mutate(data);
    else createProductMutation.mutate(data);
  };

  const isLoading = createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Sửa Sản phẩm' : 'Thêm Sản phẩm mới'}</DialogTitle>
          <DialogDescription>
            {product ? 'Cập nhật thông tin chi tiết.' : 'Điền thông tin để tạo sản phẩm mới.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="sku">SKU Code</FieldLabel>
              <Input id="sku" placeholder="VD: BPC-01" {...register('sku')} disabled={isLoading} />
              {errors.sku && <FieldError>{errors.sku.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="status">Trạng thái *</FieldLabel>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Hiển thị)</SelectItem>
                      <SelectItem value="hidden">Hidden (Ẩn)</SelectItem>
                      <SelectItem value="draft">Draft (Bản nháp)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <FieldError>{errors.status.message}</FieldError>}
            </Field>
          </div>

          {/* 🔥 BỔ SUNG DROPDOWN DANH MỤC */}
          <Field>
            <FieldLabel htmlFor="categoryId">Danh mục Sản phẩm *</FieldLabel>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || isLoadingCategories}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Chọn danh mục --" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && <FieldError>{errors.categoryId.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="name">Tên sản phẩm *</FieldLabel>
            <Input id="name" {...register('name')} disabled={isLoading} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Mô tả *</FieldLabel>
            <Textarea id="description" rows={3} {...register('description')} disabled={isLoading} />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="price">Giá (VNĐ) *</FieldLabel>
              <Input id="price" type="number" {...register('price')} disabled={isLoading} />
              {errors.price && <FieldError>{errors.price.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="stock_quantity">Tồn kho *</FieldLabel>
              <Input id="stock_quantity" type="number" {...register('stock_quantity')} disabled={isLoading} />
              {errors.stock_quantity && <FieldError>{errors.stock_quantity.message}</FieldError>}
            </Field>
          </div>

          {/* 🔥 BỔ SUNG: KHU VỰC UPLOAD ẢNH SẢN PHẨM MỚI */}
          <Field>
            <FieldLabel>Ảnh Sản Phẩm</FieldLabel>
            <div className="flex gap-4 items-start mt-2">
              
              {/* Khung vuông Preview Ảnh */}
              <div className="relative w-32 h-32 flex-shrink-0 border-2 border-dashed border-border rounded-lg overflow-hidden flex items-center justify-center bg-muted/50">
                {currentImageUrl ? (
                  <img src={currentImageUrl} alt="Product Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">Chưa có ảnh</span>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Spinner className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              {/* Nút bấm tải file và ô nhập Link */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isLoading || isUploading}
                  >
                    {isUploading ? 'Đang tải lên...' : 'Tải ảnh từ máy'}
                  </Button>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    HOẶC
                  </span>
                </div>
                
                {/* Input ẩn để hứng file từ máy */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handleFileChange} 
                />

                {/* K upload thì dán link */}
                <Input 
                  id="image_url" 
                  type="url" 
                  placeholder="Dán link ảnh trực tiếp vào đây..." 
                  {...register('image_url')} 
                  disabled={isLoading || isUploading} 
                />
              </div>
            </div>
            {errors.image_url && <FieldError>{errors.image_url.message}</FieldError>}
          </Field>
          {/* KẾT THÚC KHU VỰC UPLOAD ẢNH */}

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 h-4 w-4" />}
              {isLoading ? 'Đang lưu...' : 'Lưu Sản phẩm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}