'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProfileService } from '@/services/profile.service';
import { OrdersService } from '@/services/orders.service';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UploadService } from '@/services/upload.service';

export default function AccountPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const currentAvatar = watch('avatar_url');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Bảo vệ trang: Chưa đăng nhập thì đá về Login
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // 2. Fetch data Profile
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: ProfileService.getProfile,
    enabled: !!isAuthenticated,
  });

  // Điền data vào form khi load xong
  useEffect(() => {
    if (profile) {
      reset(profile);
    }
  }, [profile, reset]);

  // 3. Mutation cập nhật Profile
  const updateMutation = useMutation({
    mutationFn: (data: any) => ProfileService.updateProfile(data),
    onSuccess: () => {
      toast.success('Cập nhật hồ sơ thành công!');
      queryClient.invalidateQueries({ queryKey: ['my-profile', user?.id] });
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi cập nhật hồ sơ');
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };
  if (isAuthLoading || isProfileLoading) {
    return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;
  }
  if (!isAuthenticated) return null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      // Gọi lên Backend để đẩy ảnh sang Cloudinary
      const url = await UploadService.uploadImage(file);
      // Gắn URL mới vào Form
      setValue('avatar_url', url, { shouldDirty: true });
      toast.success('Tải ảnh lên thành công! Bấm "Lưu thay đổi" để hoàn tất.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi khi tải ảnh lên!');
    } finally {
      setIsUploading(false);
      // Reset lại input file để có thể chọn lại cùng 1 ảnh nếu muốn
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };
  if (isAuthLoading || isProfileLoading) {
    return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>;
  }
  if (!isAuthenticated) return null;

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Tài khoản của tôi</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
          <TabsTrigger value="profile">Hồ sơ cá nhân</TabsTrigger>
          <TabsTrigger value="orders">Lịch sử mua hàng</TabsTrigger>
        </TabsList>

        {/* TAB 1: HỒ SƠ CÁ NHÂN */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>
                Cập nhật thông tin của bạn để việc thanh toán diễn ra nhanh chóng hơn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">

                {/* Khu vực đổi Avatar */}
                <div className="flex items-center space-x-6">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-muted flex-shrink-0">
                    {currentAvatar ? (
                      <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
                        Chưa có
                      </div>
                    )}
                    {/* Hiệu ứng loading đè lên ảnh khi đang upload */}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Spinner className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={isUploading}
                    >
                      {isUploading ? 'Đang tải lên...' : 'Đổi Avatar'}
                    </Button>
                    {/* Input ẩn để hứng file */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={handleFileChange} 
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Định dạng JPEG, PNG, WEBP. Tối đa 5MB.
                    </p>
                  </div>
                </div>
                {/* Kết thúc khu vực đổi Avatar */}

                <Field>
                  <FieldLabel>Họ và Tên</FieldLabel>
                  <Input {...register('full_name')} placeholder="Nhập họ tên của bạn" />
                </Field>

                <Field>
                  <FieldLabel>Số điện thoại</FieldLabel>
                  <Input {...register('phone_number')} placeholder="Nhập số điện thoại" />
                </Field>

                <Field>
                  <FieldLabel>Địa chỉ giao hàng mặc định</FieldLabel>
                  <Textarea {...register('address')} placeholder="Nhập địa chỉ chi tiết..." rows={3} />
                </Field>

                <Button type="submit" disabled={updateMutation.isPending} className="mt-4">
                  {updateMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                  Lưu thay đổi
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: LỊCH SỬ MUA HÀNG */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử mua hàng</CardTitle>
              <CardDescription>Quản lý và theo dõi các đơn hàng bạn đã đặt.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Gọi component hiển thị bảng đơn hàng ở đây */}
              <MyOrdersTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === KHAI BÁO COMPONENT BẢNG ĐƠN HÀNG Ở DƯỚI CÙNG FILE ===
function MyOrdersTable() {
  const { data: responseData, isLoading } = useQuery({
    queryKey: ['my-orders'],
    // Bọc hàm gọi API trong một arrow function
    queryFn: () => OrdersService.getMyOrders(),
  });

  // Thêm (as any) để k lỗi khi data chưa kịp load
  const orders = (responseData as any)?.items || [];

  if (isLoading) return <div className="py-10 text-center"><Spinner className="w-6 h-6 mx-auto" /></div>;

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
        <p>Bạn chưa có đơn hàng nào.</p>
        <Button variant="link" onClick={() => window.location.href = '/'}>Bắt đầu mua sắm ngay</Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã đơn hàng</TableHead>
            <TableHead>Ngày đặt</TableHead>
            <TableHead>Tổng tiền</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order: any) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">{order.id}</TableCell>
              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium text-green-600">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount)}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={
                    order.status === 'COMPLETED' ? 'default' : 
                    order.status === 'PENDING' ? 'secondary' : 
                    order.status === 'CANCELLED' ? 'destructive' : 'outline'
                  }
                >
                  {order.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}