// User & Auth Types
export enum UserRole {
  CUSTOMER = 'ROLE_CUSTOMER',
  ADMIN = 'ROLE_ADMIN',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  image_url: string;
  stock_quantity: number;
  category_id: number;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

// Cart Types
export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product?: Product;
  originalPrice?: number;
  finalPrice?: number;
  discountNote?: string;
  itemTotal?: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  totalOriginalPrice?: number;
  totalVolumeDiscount?: number;
}

export interface AddToCartRequest {
  productId: string;
  variantId?: string;
  quantity: number;
  productName?: string;
  price?: number;
  imageUrl?: string;
}

// Order Types
export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPING = 'SHIPPING',
  DELIVERY = 'DELIVERY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUNDED_SUCCESS = 'REFUNDED_SUCCESS',
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
