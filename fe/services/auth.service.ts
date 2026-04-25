import { User, LoginRequest, RegisterRequest, LoginResponse } from '@/types';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/lib/constants';
import { useAuthStore } from '@/stores/authStore'; 
import { nestApi } from '@/lib/axiosClient';

export class AuthService {
  /**
   * Login user with email and password
   */
  static async login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await nestApi.post<any>(
      API_ENDPOINTS.AUTH_LOGIN,
      payload
    );

    const token = response.data.access_token;
    const refreshToken = response.data.refresh_token;
    const user = response.data.user; 

    if (token && user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', token);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        // Cập nhật vào Zustand
        useAuthStore.getState().setUser(user);
      }
    }
    return {
        accessToken: token,
        user: user
    } as LoginResponse;
  }

  /**
   * Register new user
   */
  static async register(payload: RegisterRequest): Promise<void> {
    // Chỉ gọi API đăng ký, không làm gì thêm vì BE không trả về Token
    const response = await nestApi.post<any>(
      API_ENDPOINTS.AUTH_REGISTER,
      payload
    );
    return response.data
    console.log(response.data);
  }

  /**
   * Get current user info
   */
  static async getCurrentUser(): Promise<User> {
    const response = await nestApi.get<User>(API_ENDPOINTS.AUTH_ME);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(response.data)
      );
    }

    return response.data;
  }

  /**
   * Logout user
   */
  static logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      useAuthStore.getState().setUser(null);
    }
  }

  /**
   * Get user from local storage (cached)
   */
  static getCachedUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  // Bắn email xin cấp lại mật khẩu
  static async forgotPassword(email: string) {
    const response = await nestApi.post(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, { email });
    return response.data;
  }

  // Gửi token và mật khẩu mới để chốt sổ
  static async resetPassword(token: string, newPassword: string) {
    const response = await nestApi.post(API_ENDPOINTS.AUTH_RESET_PASSWORD, { 
      token, 
      newPassword 
    });
    return response.data;
  }
}