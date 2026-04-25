import { nestApi } from '@/lib/axiosClient';
import { Product, CreateProductRequest, UpdateProductRequest } from '@/types';
import { API_ENDPOINTS, DEFAULT_PAGE_SIZE, DEFAULT_PAGE } from '@/lib/constants';

export class ProductsService {
  /**
   * Get all products (Đã cập nhật thêm search, status và format trả về phân trang)
   */
  static async getProducts(
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_PAGE_SIZE,
    search?: string,
    status?: string,
    category?: string
  ): Promise<{ data: Product[]; meta: any }> { // FIX LỖI Ở ĐÂY: Khai báo lại Type trả về
    const params: any = { page, limit };
    
    if (search) params.search = search;
    if (status) params.status = status;
    if (category) params.categoryId = category;

    // Ép kiểu Axios Response cho chuẩn với cục JSON NestJS bắn sang
    const response = await nestApi.get<{ data: Product[]; meta: any }>(
      API_ENDPOINTS.PRODUCTS_LIST,
      { params }
    );

    return response.data; // Lúc này response.data chính là { data: [], meta: {} }
  }

  /**
   * Get product by ID
   */
  static async getProductById(id: string): Promise<Product> {
    const response = await nestApi.get<Product>(
      API_ENDPOINTS.PRODUCT_DETAIL(id)
    );

    return response.data;
  }

  /**
   * Create new product (Admin only)
   */
  static async createProduct(payload: CreateProductRequest): Promise<Product> {
    const response = await nestApi.post<Product>(
      API_ENDPOINTS.PRODUCTS_CREATE,
      payload
    );

    return response.data;
  }

  /**
   * Update product (Admin only)
   */
  static async updateProduct(
    id: string,
    payload: UpdateProductRequest
  ): Promise<Product> {
    const response = await nestApi.put<Product>(
      API_ENDPOINTS.PRODUCT_UPDATE(id),
      payload
    );

    return response.data;
  }

  /**
   * Delete product (Admin only)
   */
  static async deleteProduct(id: string): Promise<void> {
    await nestApi.delete(API_ENDPOINTS.PRODUCT_DELETE(id));
  }
  
  // API QUẢN LÝ BIẾN THỂ (VARIANTS)
  static async addVariant(productId: string, payload: { color?: string; size?: string; price_modifier?: number; stock_quantity?: number }) {
    const response = await nestApi.post(`/products/${productId}/variants`, payload);
    return response.data;
  }

  static async updateVariant(variantId: string, payload: any) {
    const response = await nestApi.put(`/products/variants/${variantId}`, payload);
    return response.data;
  }

  static async deleteVariant(variantId: string) {
    await nestApi.delete(`/products/variants/${variantId}`);
  }

  static async submitReview(productId: string, payload: { rating: number; comment: string }) {
    const response = await nestApi.post(`/products/${productId}/reviews`, payload);
    return response.data;
  }

  static async getProductReviews(productId: string) {
    const response = await nestApi.get(`/products/${productId}/reviews`);
    return response.data;
  }
}
