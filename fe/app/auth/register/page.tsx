import { RegisterForm } from '@/components/features/auth/register-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { Suspense } from 'react';

export const metadata = {
  title: 'Register - ThapCam E-Commerce',
  description: 'Create a new account',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Sign up to start shopping at ThapCam
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-[200px] flex items-center justify-center">Loading...</div>}>
            <RegisterForm />
          </Suspense>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Already have an account?{' '}
            <Link href={ROUTES.LOGIN} className="text-primary hover:underline font-semibold">
              Login here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
