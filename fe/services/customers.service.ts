import { nestApi } from '@/lib/axiosClient'; 
import { User, PaginatedResponse } from '@/types';
import { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } from '@/lib/constants';

export class CustomersService {
  /**
   * Get all customers (Admin only)
   */
  static async getAllCustomers(
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<User>> {
    // Trỏ thẳng vào route quản lý user của NestJS
    const response = await nestApi.get<PaginatedResponse<User>>(
      '/users',
      { params: { page, limit } }
    );
    return response.data;
  }

  /**
   * Get customer details by ID (Admin only)
   */
  static async getCustomerById(id: string): Promise<User> {
    const response = await nestApi.get<User>(
      `/users/${id}`
    );
    return response.data;
  }
}