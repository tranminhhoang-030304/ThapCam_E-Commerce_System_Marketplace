'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingBag, Users, Package } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { springApi } from '@/lib/axiosClient';
import { Skeleton } from '@/components/ui/skeleton';

export function OverviewTab() {
  // GỌI API LẤY THỐNG KÊ
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      // Gọi sang cái API sếp vừa tạo ở Spring Boot (Nhớ đổi lại đường dẫn nếu sếp set route khác)
      const res = await springApi.get('/admin/orders/dashboard-stats');
      return res.data;
    },
    refetchInterval: 60000, // Tự động refetch mỗi phút để cập nhật doanh thu
  });

  if (error) {
    return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Không thể tải dữ liệu thống kê!</div>;
  }

  // Nếu đang gọi API thì hiện khung xương (Skeleton)
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="h-24 p-6" /></Card>
          ))}
        </div>
        <Card><CardContent className="h-[400px] p-6" /></Card>
      </div>
    );
  }

  // Dữ liệu bóc tách từ API
  const stats = data || {};
  const revenueChart = stats.revenueChart || [];

  return (
    <div className="space-y-6">
      {/* 4 THẺ TỔNG QUAN (SUMMARY CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Doanh Thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Tính trên đơn đã thanh toán</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Đơn Hàng</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">Tất cả trạng thái</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khách Hàng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">Tài khoản trên hệ thống</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản Phẩm Active</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts || 0}</div>
            <p className="text-xs text-muted-foreground">Đang mở bán</p>
          </CardContent>
        </Card>
      </div>

      {/* BIỂU ĐỒ DOANH THU */}
      <Card className="col-span-4 shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle>Doanh thu 7 ngày gần nhất</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value / 1000000}M`} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                  labelStyle={{ color: '#000', fontWeight: 'bold', marginBottom: '8px' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="total" 
                  fill="currentColor" 
                  radius={[6, 6, 0, 0]} 
                  className="fill-blue-600"
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}