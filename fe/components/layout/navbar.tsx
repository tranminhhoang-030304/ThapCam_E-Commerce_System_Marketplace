'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Search, LogOut, LogIn, User, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useCartUIStore } from '@/stores/cartUIStore';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';
import NotificationHub from '@/components/NotificationHub';
// IMPORT THÊM CHO TÍNH NĂNG LIVE SEARCH
import { useQuery } from '@tanstack/react-query';
import { ProductsService } from '@/services/products.service';
import { Skeleton } from '@/components/ui/skeleton';

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const { toggleCart, cartItemCount } = useCartUIStore();
  //  STATE & LOGIC CHO LIVE SEARCH
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Kỹ thuật Debounce: Khách ngừng gõ 500ms mới gọi API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Gọi API lấy 5 sản phẩm gợi ý (chỉ lấy sản phẩm đang ACTIVE)
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['live-search', debouncedSearch],
    queryFn: () => ProductsService.getProducts(1, 5, debouncedSearch, 'active'),
    enabled: debouncedSearch.length > 0, // Chỉ gọi API khi có chữ
  });

  // Click ra ngoài thì đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setIsDropdownOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const products = searchResults?.data || [];

  const handleLogout = () => {
    logout();
    router.push(ROUTES.HOME);
  };

  const handleLoginClick = () => {
    router.push(ROUTES.LOGIN);
  };

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={ROUTES.HOME} className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            <span className="font-bold text-lg">ThapCam</span>
          </Link>

          {/* Search Bar ĐÃ ĐƯỢC NÂNG CẤP THÀNH LIVE SEARCH */}
          <div className="flex-1 max-w-md mx-8 relative" ref={dropdownRef}>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                className="pl-10 pr-16 h-10 w-full"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => searchTerm && setIsDropdownOpen(true)}
              />
              <Button 
                type="submit" 
                size="sm" 
                variant="secondary" 
                className="absolute right-1 h-8 px-3"
              >
                Tìm
              </Button>
            </form>

            {/* DROPDOWN GỢI Ý SẢN PHẨM */}
            {isDropdownOpen && searchTerm && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg overflow-hidden z-50">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : products.length > 0 ? (
                  <div className="max-h-[70vh] overflow-y-auto">
                    {products.map((product: any) => (
                      <div 
                        key={product.id}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setSearchTerm(''); // Xóa chữ sau khi chọn
                          router.push(`/products/${product.id}`); // Nhảy vào trang chi tiết
                        }}
                        className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        {/* Ảnh thu nhỏ */}
                        <div className="w-10 h-10 shrink-0 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No img</span>
                          )}
                        </div>
                        
                        {/* Thông tin */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-green-600 font-semibold">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="p-2 text-center bg-slate-50 border-t">
                      <button 
                        type="button"
                        onClick={handleSearchSubmit}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        Xem tất cả kết quả cho "{searchTerm}"
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Không tìm thấy sản phẩm nào phù hợp.
                  </div>
                )}
              </div>
            )}
          </div>
          {/* END SEARCH BAR */}

          {/* Right Section (GIỮ NGUYÊN) */}
          <div className="flex items-center gap-4">
            {/* NÚT THÔNG BÁO (MỚI) */}
            <NotificationHub />

            {/* Cart Icon */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCart}
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              )}
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Button>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  
                  {/* 🔥 KHU VỰC 1: QUYỀN LỰC TỐI CAO (CHỈ ADMIN MỚI THẤY) */}
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => router.push(ROUTES.ADMIN)}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* 🔥 KHU VỰC 2: QUYỀN LỢI CƠ BẢN (AI ĐĂNG NHẬP CŨNG THẤY) */}
                  <DropdownMenuItem onClick={() => router.push(ROUTES.ACCOUNT)}>
                    <span>My Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(ROUTES.ORDERS)}>
                    <span>My Orders</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={handleLoginClick} size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}