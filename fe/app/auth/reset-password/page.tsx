'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token'); // Bóc cái mã token từ URL ra

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mutation = useMutation({
    mutationFn: (newPass: string) => AuthService.resetPassword(token!, newPass),
    onSuccess: () => {
      toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      router.push('/auth/login'); // Đổi xong đá về trang đăng nhập
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Mã khôi phục không hợp lệ hoặc đã hết hạn!');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.error('Lỗi: Không tìm thấy mã khôi phục!');
    if (password.length < 6) return toast.error('Mật khẩu phải có ít nhất 6 ký tự!');
    if (password !== confirmPassword) return toast.error('Mật khẩu nhập lại không khớp!');
    
    mutation.mutate(password);
  };

  if (!token) {
    return (
      <div className="text-center p-10 bg-red-50 text-red-600 rounded-xl">
        Lỗi: Đường dẫn không hợp lệ. Vui lòng kiểm tra lại email!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Mật khẩu mới</label>
        <Input 
          type="password" 
          placeholder="Nhập mật khẩu mới..." 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Nhập lại mật khẩu</label>
        <Input 
          type="password" 
          placeholder="Xác nhận mật khẩu mới..." 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="h-12"
        />
      </div>
      <Button type="submit" className="w-full h-12" disabled={mutation.isPending}>
        {mutation.isPending ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border">
        <h1 className="text-2xl font-bold text-center mb-6">Tạo Mật Khẩu Mới</h1>
        <Suspense fallback={<div className="text-center text-muted-foreground">Đang tải...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}