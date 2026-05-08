import { LoginForm } from '@/components/features/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { Suspense } from 'react';

export const metadata = {
  title: 'Login - ThapCam E-Commerce',
  description: 'Login to your account',
};

export default function LoginPage() {
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Sign in to your account to continue shopping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-[200px] flex items-center justify-center">Loading...</div>}>
            <LoginForm />
          </Suspense>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Don't have an account?{' '}
            <Link href={ROUTES.REGISTER} className="text-primary hover:underline font-semibold">
              Register here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
