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

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setServerError(null);

      // 1. Gọi API và HỨNG DỮ LIỆU trả về (cái cục JSON có chứa message)
      const res = await registerUser({
        name: data.name, 
        email: data.email,
        password: data.password,
      });
      const successMessage = res?.message || 'Account created successfully!';
      toast.success(successMessage);
      // 3. Đăng ký xong thì đẩy về trang Login
      router.push('/auth/login'); 
    } catch (error: any) {
      console.log("Nguyên nhân bị 400:", error.response?.data);
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
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
        <FieldLabel htmlFor="name">Full Name</FieldLabel>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          {...register('name')}
          disabled={isLoading}
        />
        {errors.name && (
          <FieldError>{errors.name.message}</FieldError>
        )}
      </Field>

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
        <FieldLabel htmlFor="password">Password</FieldLabel>
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

      <Field>
        <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          {...register('confirmPassword')}
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <FieldError>{errors.confirmPassword.message}</FieldError>
        )}
      </Field>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading && <Spinner className="mr-2 h-4 w-4" />}
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  );
}
