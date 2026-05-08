'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from '@/components/features/admin/overview-tab'; 
import { ProductsTab } from '@/components/features/admin/products-tab';
import { OrdersTab } from '@/components/features/admin/orders-tab';
import { CustomersTab } from '@/components/features/admin/customers-tab';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoriesTab } from '@/components/features/admin/categories-tab';
import { useSearchParams } from 'next/navigation';
import { VouchersTab } from '@/components/features/admin/vouchers-tab';

function TabSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview'); // tab mặc định là Overview
  
  // BẢO VỆ ROUTE: Chỉ Admin mới được vào
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isLoadingAuth = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    router.push(`/admin?tab=${val}`, { scroll: false });
  };

  useEffect(() => {
    if (!isLoadingAuth && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, isLoadingAuth, router]);

  if (!isAdmin) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage your store's products, orders, and customers</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-slate-100/50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <OverviewTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="categories" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <CategoriesTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="products" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <ProductsTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="orders" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <OrdersTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="customers" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <CustomersTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="vouchers" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <VouchersTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Đang tải bảng điều khiển...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}