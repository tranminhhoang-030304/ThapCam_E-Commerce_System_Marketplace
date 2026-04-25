import { springApi } from '@/lib/axiosClient'; 
import { Order, CreateOrderRequest, UpdateOrderStatusRequest, PaginatedResponse } from '@/types';
import { API_ENDPOINTS, DEFAULT_PAGE_SIZE, DEFAULT_PAGE } from '@/lib/constants';

export class OrdersService {
  /**
   * Lấy đơn hàng của user đang đăng nhập
   */
  static async getMyOrders(
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<Order>> {
    const response = await springApi.get<PaginatedResponse<Order>>(
      API_ENDPOINTS.ORDERS_LIST, 
      { params: { page, limit } }
    );
    return response.data;
  }

  /**
   * Lấy TOÀN BỘ đơn hàng (CHỈ DÀNH CHO ADMIN)
   */
  // SỬA LẠI: Nhận 1 object chứa page, size và status
  static async getAllOrders(params: {
    page: number;
    size: number;
    status?: string;
  }): Promise<PaginatedResponse<Order>> { 
    // Trỏ đúng vào Admin Controller
    const response = await springApi.get<PaginatedResponse<Order>>(
      '/admin/orders', 
      { 
        params: { 
          page: params.page, 
          size: params.size, // Đổi limit thành size cho chuẩn Spring Boot Pageable
          status: params.status 
        } 
      }
    );
    return response.data;
  }

  static async getOrderById(id: string): Promise<Order> {
    const response = await springApi.get<Order>(
      API_ENDPOINTS.ORDER_DETAIL(id)
    );
    return response.data;
  }

  static async createOrder(payload: CreateOrderRequest): Promise<Order> {
    const response = await springApi.post<Order>(
      API_ENDPOINTS.ORDERS_CREATE,
      payload
    );
    return response.data;
  }

  /**
   * Cập nhật trạng thái đơn hàng (CHỈ DÀNH CHO ADMIN)
   */
  static async updateOrderStatus(
    id: string,
    payload: UpdateOrderStatusRequest
  ): Promise<Order> {
    // SỬA LẠI: Trỏ đúng vào Admin Controller của Spring Boot
    const response = await springApi.patch<Order>(
      `/admin/orders/${id}/status`,
      payload
    );
    return response.data;
  }
}