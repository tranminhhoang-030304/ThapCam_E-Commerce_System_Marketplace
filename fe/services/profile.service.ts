import { nestApi } from '@/lib/axiosClient';

export class ProfileService {
  // Lấy thông tin Profile
  static async getProfile() {
    const response = await nestApi.get('/users/me/profile');
    return response.data;
  }

  // Cập nhật Profile
  static async updateProfile(data: { full_name?: string; phone_number?: string; address?: string; avatar_url?: string }) {
    const response = await nestApi.put('/users/me/profile', data);
    return response.data;
  }
}