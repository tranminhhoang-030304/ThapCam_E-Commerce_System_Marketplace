'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES, TOAST_MESSAGES } from '@/lib/constants';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  // 🔥 CÁI BẪY HỨNG TOKEN VÀ ĐỒNG BỘ DỮ LIỆU USER
  useEffect(() => {
    const processGoogleCallback = async () => {
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');

      if (accessToken && refreshToken) {
        // 1. Lưu trữ Token
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        // 2. Xóa Token khỏi URL
        window.history.replaceState({}, document.title, "/auth/login");
        try {
          // 3. GỌI API LẤY THÔNG TIN USER VÀ ĐẮP VÀO STORE
          const user = await AuthService.getCurrentUser();
          useAuthStore.getState().setUser(user);
          // 4. Thông báo và đá khách về trang chủ
          toast.success('Đăng nhập bằng Google thành công!');
          router.push('/');
        } catch (error) {
          console.error('Lỗi khi đồng bộ thông tin Google:', error);
          toast.error('Có lỗi xảy ra khi tải dữ liệu người dùng!');
        }
      }
    };
    processGoogleCallback();
  }, [searchParams, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      await login(data);
      toast.success(TOAST_MESSAGES.LOGIN_SUCCESS);
      router.push(ROUTES.HOME);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded-md text-sm">
          {serverError}
        </div>
      )}

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          {...register('email')}
          disabled={isLoading}
        />
        {errors.email && (
          <FieldError>{errors.email.message}</FieldError>
        )}
      </Field>

      <Field>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Link 
            href="/auth/forgot-password" 
            className="text-sm text-primary hover:underline font-medium"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <FieldError>{errors.password.message}</FieldError>
        )}
      </Field>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading && <Spinner className="mr-2 h-4 w-4" />}
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
      </div>
      <Button 
        type="button" 
        variant="outline" 
        className="w-full" 
        onClick={() => window.location.href = 'http://localhost:4000/api/auth/google'}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
        </svg>
        Google
      </Button>
    </form>
  );
}
