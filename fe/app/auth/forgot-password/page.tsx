'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (emailToReset: string) => AuthService.forgotPassword(emailToReset),
    onSuccess: () => {
      setIsSuccess(true);
      toast.success('Đã gửi email khôi phục!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Vui lòng nhập email!');
    mutation.mutate(email);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border">
        <h1 className="text-2xl font-bold text-center mb-2">Quên Mật Khẩu?</h1>
        
        {isSuccess ? (
          <div className="text-center space-y-4">
            <p className="text-green-600 bg-green-50 p-4 rounded-lg">
              Chúng tôi đã gửi một đường dẫn khôi phục đến email <strong>{email}</strong>. Vui lòng kiểm tra hộp thư đến (và cả thư mục Spam).
            </p>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">Quay lại Đăng nhập</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-slate-500 text-center mb-6 text-sm">
              Đừng lo lắng! Hãy nhập email bạn đã đăng ký, chúng tôi sẽ gửi cho bạn đường dẫn để đặt lại mật khẩu.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input 
                  type="email" 
                  placeholder="Nhập email của bạn..." 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  disabled={mutation.isPending}
                />
              </div>
              <Button type="submit" className="w-full h-12 text-md" disabled={mutation.isPending}>
                {mutation.isPending ? 'Đang gửi...' : 'Gửi mã khôi phục'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-slate-500">
              Nhớ ra mật khẩu rồi? <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline">Đăng nhập ngay</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}