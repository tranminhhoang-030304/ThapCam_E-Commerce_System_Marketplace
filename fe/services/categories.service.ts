import { nestApi } from '@/lib/axiosClient';

export class CategoriesService {
  static async getAll() {
    const response = await nestApi.get('/categories');
    return response.data;
  }

  static async create(data: { name: string; slug: string }) {
    const response = await nestApi.post('/categories', data);
    return response.data;
  }

  static async update(id: string, data: { name: string; slug: string }) {
    const response = await nestApi.put(`/categories/${id}`, data);
    return response.data;
  }

  static async remove(id: string) {
    const response = await nestApi.delete(`/categories/${id}`);
    return response.data;
  }
}