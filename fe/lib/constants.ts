// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

// Route Paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: (id: string) => `/products/${id}`,
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDERS: '/orders',
  ORDER_DETAIL: (id: string) => `/orders/${id}`,
  ADMIN: '/admin',
  ADMIN_PRODUCTS: '/admin?tab=products',
  ADMIN_ORDERS: '/admin?tab=orders',
  ADMIN_CUSTOMERS: '/admin?tab=customers',
  ACCOUNT: '/account',
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_ME: '/auth/me',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',

  // Products
  PRODUCTS_LIST: '/products',
  PRODUCTS_CREATE: '/products',
  PRODUCT_DETAIL: (id: string) => `/products/${id}`,
  PRODUCT_UPDATE: (id: string) => `/products/${id}`,
  PRODUCT_DELETE: (id: string) => `/products/${id}`,

  // Cart
  CART_GET: '/cart',
  CART_ADD_ITEM: '/cart/items',
  CART_REMOVE_ITEM: (itemId: string) => `/cart/items/${itemId}`,
  CART_UPDATE_ITEM: (itemId: string) => `/cart/items/${itemId}`,

  // Orders
  ORDERS_LIST: '/orders',
  ORDERS_CREATE: '/orders',
  ORDER_DETAIL: (id: string) => `/orders/${id}`,
  ORDER_UPDATE_STATUS: (id: string) => `/orders/${id}/status`,

  // Customers (Admin)
  CUSTOMERS_LIST: '/customers',
  CUSTOMER_DETAIL: (id: string) => `/customers/${id}`,

  // Payment
  PAYMENT_INITIALIZE: '/payments/initialize',
};

// Pagination Defaults
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_PAGE = 1;

// Cache Configuration
export const QUERY_CACHE_TIME = {
  PRODUCTS: 5 * 60 * 1000, // 5 minutes
  PRODUCT_DETAIL: 10 * 60 * 1000, // 10 minutes
  CART: 1 * 60 * 1000, // 1 minute
  ORDERS: 5 * 60 * 1000, // 5 minutes
  CUSTOMERS: 10 * 60 * 1000, // 10 minutes
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  CART_STATE: 'cart_state',
};

// Toast Messages
export const TOAST_MESSAGES = {
  ADD_TO_CART_SUCCESS: 'Added to cart successfully',
  REMOVE_FROM_CART_SUCCESS: 'Removed from cart',
  CHECKOUT_SUCCESS: 'Order placed successfully',
  LOGIN_SUCCESS: 'Logged in successfully',
  LOGOUT_SUCCESS: 'Logged out',
  PRODUCT_CREATED: 'Product created successfully',
  PRODUCT_UPDATED: 'Product updated successfully',
  PRODUCT_DELETED: 'Product deleted successfully',
  ORDER_STATUS_UPDATED: 'Order status updated',
};
