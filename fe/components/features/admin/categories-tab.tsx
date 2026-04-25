'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoriesService } from '@/services/categories.service';
import { toast } from 'sonner';
import { FolderOpen } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
// Import UI Components của Shadcn
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2 } from 'lucide-react';

export function CategoriesTab() {
  const queryClient = useQueryClient();
  
  // STATE: Quản lý Popup Thêm/Sửa
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });

  // FETCH: Lấy danh sách Categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => CategoriesService.getAll(),
  });

  // MUTATIONS: Thêm, Sửa, Xóa
  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsDialogOpen(false);
      setFormData({ name: '', slug: '' });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const createMutation = useMutation({ mutationFn: CategoriesService.create, ...mutationOptions });
  const updateMutation = useMutation({ mutationFn: (data: any) => CategoriesService.update(editingId!, data), ...mutationOptions });
  const deleteMutation = useMutation({ 
    mutationFn: CategoriesService.remove,
    onSuccess: () => {
      toast.success('Đã xóa danh mục!');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    }
  });

  // HÀM XỬ LÝ: Tự động tạo slug (đường dẫn) từ tên danh mục
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
      .replace(/[^a-z0-9 ]/g, "") // Xóa ký tự đặc biệt
      .replace(/\s+/g, "-"); // Thay dấu cách bằng dấu gạch ngang
    
    setFormData({ name, slug });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.slug) return toast.error('Vui lòng điền đủ thông tin');
    
    if (editingId) {
      updateMutation.mutate(formData);
      toast.info('Đang cập nhật...');
    } else {
      createMutation.mutate(formData);
      toast.info('Đang tạo mới...');
    }
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, slug: cat.slug });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', slug: '' });
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="w-10 h-10" /></div>;

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl">Danh mục Sản phẩm</CardTitle>
          <CardDescription>Quản lý các nhóm phân loại sản phẩm trên hệ thống.</CardDescription>
        </div>
        <Button onClick={openCreate} className="bg-primary">
          <Plus className="w-4 h-4 mr-2" /> Thêm Danh mục
        </Button>
      </CardHeader>
      
      <CardContent className="px-0 border rounded-md">
        {categories.length === 0 ? (
          <EmptyState 
            icon={FolderOpen}
            title="Chưa có Danh mục nào"
            description="Hệ thống của bạn đang trống. Hãy tạo danh mục đầu tiên để phân loại sản phẩm dễ dàng hơn nhé."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID (UUID)</TableHead>
                <TableHead>Tên Danh mục</TableHead>
                <TableHead>Đường dẫn (Slug)</TableHead>
                <TableHead className="text-center">Số lượng SP</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat: any) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{cat.id}</TableCell>
                  <TableCell className="font-semibold">{cat.name}</TableCell>
                  <TableCell className="font-mono text-sm text-blue-600">{cat.slug}</TableCell>
                  <TableCell className="text-center">
                    <div className="relative inline-block group">
                      {/* Cục Badge hiển thị số lượng */}
                      <span className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs cursor-help transition-colors duration-200">
                        {cat.products?.length || 0} SP
                      </span>
                      
                      {/* Khung Tooltip (Chỉ hiện khi hover chuột vào group) */}
                      {cat.products && cat.products.length > 0 && (
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 bg-slate-800 text-white rounded-lg shadow-xl p-3 text-left opacity-0 group-hover:opacity-100 animate-in fade-in zoom-in duration-200">
                          <p className="font-semibold border-b border-slate-600 pb-1 mb-2 text-[11px] text-slate-300 uppercase tracking-wider">
                            Danh sách sản phẩm:
                          </p>
                          {/* Danh sách có thanh cuộn nếu quá dài */}
                          <ul className="list-disc pl-4 space-y-1 max-h-40 overflow-y-auto text-xs pr-1">
                            {cat.products.map((product: any) => (
                              <li key={product.id} className="truncate" title={product.name}>
                                {product.name}
                              </li>
                            ))}
                          </ul>
                          {/* Cái mũi tên nhọn chỉ xuống dưới */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                      <Edit className="w-4 h-4 text-yellow-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa danh mục "${cat.name}"?`)) {
                          deleteMutation.mutate(cat.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* POPUP THÊM/SỬA DANH MỤC */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Sửa Danh mục' : 'Thêm Danh mục mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên danh mục</Label>
              <Input 
                placeholder="VD: Điện thoại, Laptop, Phụ kiện..." 
                value={formData.name} 
                onChange={handleNameChange} 
              />
            </div>
            <div className="space-y-2">
              <Label>Đường dẫn (Slug) - Tự động tạo</Label>
              <Input 
                value={formData.slug} 
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })} 
                className="bg-muted"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}