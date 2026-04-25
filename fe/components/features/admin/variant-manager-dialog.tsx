'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductsService } from '@/services/products.service';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';

interface VariantManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
}

export function VariantManagerDialog({ open, onOpenChange, product }: VariantManagerProps) {
  const queryClient = useQueryClient();
  
  const [newVariant, setNewVariant] = useState({ color: '', size: '', price_modifier: 0, stock_quantity: 0 });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  const resetForm = () => {
    setNewVariant({ color: '', size: '', price_modifier: 0, stock_quantity: 0 });
    setEditingVariantId(null);
  };

  const addMutation = useMutation({
    mutationFn: () => ProductsService.addVariant(product.id, newVariant),
    onSuccess: () => {
      toast.success('Đã thêm phân loại mới');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => toast.error('Lỗi khi thêm phân loại'),
  });

  const updateMutation = useMutation({
    // 🔥 FIX LỖI: Truyền đúng id và payload
    mutationFn: (data: { id: string, payload: any }) => ProductsService.updateVariant(data.id, data.payload),
    onSuccess: () => {
      toast.success('Cập nhật thành công');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => toast.error('Lỗi khi cập nhật'),
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) => ProductsService.deleteVariant(variantId),
    onSuccess: () => {
      toast.success('Đã xóa phân loại');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => toast.error('Lỗi khi xóa phân loại'),
  });

  const handleSubmit = () => {
    if (editingVariantId) {
      // 🔥 FIX LỖI CẬP NHẬT: Phải truyền đúng object có chứa id
      updateMutation.mutate({ id: editingVariantId, payload: newVariant });
    } else {
      addMutation.mutate();
    }
  };

  const handleEditClick = (variant: any) => {
    setEditingVariantId(variant.id);
    setNewVariant({
      color: variant.color || '',
      size: variant.size || '',
      price_modifier: variant.price_modifier || 0,
      stock_quantity: variant.stock_quantity || 0,
    });
  };

  if (!product) return null;
  const variants = product.variants || [];

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetForm(); 
      }}
    >
      {/* Dialog giãn rộng theo nội dung */}
      <DialogContent className="max-w-max min-w-[80vw] max-h-[90vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl">Quản lý Phân loại: <span className="text-primary">{product.name}</span></DialogTitle>
          <DialogDescription>
            Thêm hoặc sửa các màu sắc, kích cỡ, mức giá chênh lệch và tồn kho.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 flex-1 overflow-y-auto pr-2">
          {/* KHU VỰC THÊM/SỬA */}
          <div className={`p-5 rounded-xl border transition-colors ${editingVariantId ? 'bg-blue-50/80 border-blue-300' : 'bg-slate-50'}`}>
            <h4 className="text-sm font-semibold mb-4 text-slate-700">
              {editingVariantId ? 'Đang sửa phân loại' : 'Thêm phân loại mới'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Tùy chọn 1</label>
                <Input placeholder="VD: Đen bóng" value={newVariant.color} onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Tùy chọn 2</label>
                <Input placeholder="VD: XL" value={newVariant.size} onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Chênh lệch giá (VNĐ)</label>
                <Input type="number" placeholder="VD: 50000" value={newVariant.price_modifier} onChange={(e) => setNewVariant({ ...newVariant, price_modifier: Number(e.target.value) })} className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Tồn kho</label>
                <Input type="number" value={newVariant.stock_quantity} onChange={(e) => setNewVariant({ ...newVariant, stock_quantity: Number(e.target.value) })} className="bg-white" />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-5">
              {editingVariantId && (
                <Button variant="outline" onClick={resetForm} className="min-w-[100px]">
                  Hủy
                </Button>
              )}
              <Button 
                onClick={handleSubmit} 
                disabled={addMutation.isPending || updateMutation.isPending || (!newVariant.color && !newVariant.size)}
                className={`min-w-[120px] ${editingVariantId ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              >
                {editingVariantId ? 'Lưu cập nhật' : <><Plus className="w-4 h-4 mr-2" /> Thêm mới</>}
              </Button>
              
              {editingVariantId && (
                <Button variant="outline" onClick={resetForm} className="px-3">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* DANH SÁCH BIẾN THỂ HIỆN TẠI */}
          <div className="border rounded-md bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[600px] w-full">
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[20%]">Màu sắc / Đặc điểm</TableHead>
                    <TableHead className="w-[25%]">Kích cỡ / Tùy chọn</TableHead>
                    <TableHead className="w-[20%]">Giá chênh lệch</TableHead>
                    <TableHead className="w-[15%] text-center">Tồn kho</TableHead>
                    <TableHead className="w-[20%] text-right pr-4">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Sản phẩm này chưa có biến thể nào. (Đang bán theo giá và tồn kho gốc).
                      </TableCell>
                    </TableRow>
                  ) : (
                    variants.map((v: any) => (
                      <TableRow key={v.id} className={`transition-colors ${editingVariantId === v.id ? "bg-blue-50/50" : "hover:bg-slate-50/50"}`}>
                        <TableCell className="font-medium truncate max-w-[150px]" title={v.color}>{v.color || '-'}</TableCell>
                        <TableCell className="font-medium truncate max-w-[200px]" title={v.size}>{v.size || '-'}</TableCell>
                        <TableCell className={v.price_modifier > 0 ? 'text-green-600 font-medium' : v.price_modifier < 0 ? 'text-red-600 font-medium' : ''}>
                          {v.price_modifier > 0 ? '+' : ''}{new Intl.NumberFormat('vi-VN').format(v.price_modifier)} ₫
                        </TableCell>
                        <TableCell className="text-center">
                           <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v.stock_quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                             {v.stock_quantity}
                           </span>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditClick(v)}
                              title="Sửa biến thể"
                              className="h-8 w-8"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteMutation.mutate(v.id)}
                              disabled={deleteMutation.isPending || editingVariantId === v.id}
                              title="Xóa biến thể"
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}