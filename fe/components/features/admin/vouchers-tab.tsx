'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VouchersService } from '@/services/vouchers.service';
import { Ticket, Plus, Percent, CircleDollarSign, Edit2, Search, Power, PowerOff, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function VouchersTab() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderValue: '',
    usageLimit: '',
  });

  // Hiệu ứng chờ gõ xong mới tìm (Tránh spam API)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // FETCH DATA THÔNG MINH (Có từ khóa thì Search, không có thì Get All)
  const { data: vouchers, isLoading } = useQuery({
    queryKey: ['admin-vouchers', debouncedSearch],
    queryFn: () => debouncedSearch ? VouchersService.searchVouchers(debouncedSearch) : VouchersService.getAllVouchers(),
  });

  // Mở form thêm mới
  const handleOpenCreate = () => {
    setEditId(null);
    setFormData({ code: '', discountType: 'PERCENTAGE', discountValue: '', minOrderValue: '', usageLimit: '' });
    setIsOpen(true);
  };

  // Mở form chỉnh sửa
  const handleEditClick = (voucher: any) => {
    setEditId(voucher.id);
    setFormData({
      code: voucher.code,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue.toString(),
      minOrderValue: voucher.minOrderValue ? voucher.minOrderValue.toString() : '',
      usageLimit: voucher.usageLimit ? voucher.usageLimit.toString() : '',
    });
    setIsOpen(true);
  };

  // Mutation Lưu / Sửa
  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editId) return VouchersService.updateVoucher(editId, data);
      return VouchersService.createVoucher(data);
    },
    onSuccess: () => {
      toast.success(editId ? 'Cập nhật mã khuyến mãi thành công!' : 'Tạo mã khuyến mãi thành công!');
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lỗi khi lưu Voucher!');
    }
  });

  // MUTATION KÍCH HOẠT / KHÓA
  const toggleMutation = useMutation({
    mutationFn: (id: string) => VouchersService.toggleStatus(id),
    onSuccess: () => {
      toast.success('Đã thay đổi trạng thái mã khuyến mãi!');
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] });
    },
    onError: () => toast.error('Lỗi khi đổi trạng thái!')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => VouchersService.deleteVoucher(id),
    onSuccess: () => {
      toast.success('Đã xóa mã khuyến mãi vĩnh viễn!');
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] });
    },
    onError: () => toast.error('Lỗi khi xóa mã khuyến mãi!')
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn mã khuyến mãi này không?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      code: formData.code,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : null,
      usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
    });
  };

  if (isLoading && !vouchers) return <div className="flex justify-center py-20"><Spinner className="w-10 h-10" /></div>;

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Ticket className="w-6 h-6 text-blue-600" /> Quản lý Khuyến mãi
          </CardTitle>
          <CardDescription>Cấu hình mã giảm giá, sự kiện Flash Sale.</CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {/* Ô TÌM KIẾM */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Tìm mã code..." 
              className="pl-8 w-[200px]" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button onClick={handleOpenCreate}><Plus className="w-4 h-4 mr-2" /> Tạo mã mới</Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? 'Chỉnh Sửa Mã Khuyến Mãi' : 'Tạo Mã Khuyến Mãi Mới'}</DialogTitle>
                {/* THÊM DESCRIPTION ĐỂ FIX WARN CỦA RADIX UI */}
                <DialogDescription className="sr-only">
                  Điền các thông tin cần thiết để quản lý mã giảm giá của hệ thống.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Mã Code (VD: TET2026)</label>
                  <Input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Loại giảm giá</label>
                    <Select value={formData.discountType} onValueChange={v => setFormData({...formData, discountType: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Giảm phần trăm (%)</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Trừ tiền mặt (VND)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mức giảm</label>
                    <Input required type="number" placeholder="VD: 10 hoặc 50000" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Đơn tối thiểu (Tùy chọn)</label>
                    <Input type="number" placeholder="VD: 200000" value={formData.minOrderValue} onChange={e => setFormData({...formData, minOrderValue: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Giới hạn lượt (Tùy chọn)</label>
                    <Input type="number" placeholder="VD: 100" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Đang lưu...' : (editId ? 'Cập Nhật' : 'Tạo Khuyến Mãi')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="px-0 border rounded-md mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã Code</TableHead>
              <TableHead>Loại giảm giá</TableHead>
              <TableHead>Điều kiện</TableHead>
              <TableHead className="text-center">Đã dùng</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Không tìm thấy mã khuyến mãi nào.</TableCell></TableRow>
            ) : (
              vouchers?.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-bold text-blue-700 font-mono">{v.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-medium">
                      {v.discountType === 'PERCENTAGE' ? <Percent className="w-4 h-4 text-orange-500" /> : <CircleDollarSign className="w-4 h-4 text-green-500" />}
                      {v.discountType === 'PERCENTAGE' ? `${v.discountValue}%` : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.discountValue)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Đơn TT: {v.minOrderValue ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.minOrderValue) : '0đ'}
                  </TableCell>
                  <TableCell className="text-center font-medium text-slate-600">
                    {v.usedCount} {v.usageLimit ? `/ ${v.usageLimit}` : ''}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={v.isActive ? "default" : "secondary"} className={v.isActive ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}>
                      {v.isActive ? 'HOẠT ĐỘNG' : 'ĐÃ KHÓA'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Đang bật thì Xanh, đang tắt thì Đỏ */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toggleMutation.mutate(v.id)} 
                        disabled={toggleMutation.isPending}
                        title={v.isActive ? "Đang hoạt động (Bấm để Khóa)" : "Đã khóa (Bấm để Kích hoạt)"}
                      >
                        {v.isActive ? <Power className="w-4 h-4 text-green-600" /> : <PowerOff className="w-4 h-4 text-red-500" />}
                      </Button>
                      
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(v)} title="Sửa mã">
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </Button>

                      {/* THÊM NÚT XÓA */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(v.id)} 
                        disabled={deleteMutation.isPending}
                        title="Xóa mã này"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}