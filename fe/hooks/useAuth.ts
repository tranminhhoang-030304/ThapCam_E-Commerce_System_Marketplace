import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/services/auth.service';
import { LoginRequest, RegisterRequest } from '@/types';
import { useCallback, useEffect, useState } from 'react';

export function useAuth() {
  const authStore = useAuthStore();

  const login = useCallback(
    async (payload: LoginRequest) => {
      try {
        authStore.setLoading(true);
        authStore.setError(null);

        const response = await AuthService.login(payload) as any;
        authStore.setUser(response.user);

        // LƯU CỨNG VÀO TRÌNH DUYỆT
        localStorage.setItem('user', JSON.stringify(response.user));
        const res = response as any;
        if (res.token) localStorage.setItem('token', res.token);
        if (res.accessToken) localStorage.setItem('token', res.accessToken);

        return response;
      } catch (error: any) {
        const message = error.response?.data?.message || 'Login failed';
        authStore.setError(message);
        throw error;
      } finally {
        authStore.setLoading(false);
      }
    },
    [authStore]
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      try {
        authStore.setLoading(true);
        authStore.setError(null);

        const response = await AuthService.register(payload) as any;
        authStore.setUser(response.user);
        
        localStorage.setItem('user', JSON.stringify(response.user));
        const res = response as any;
        if (res.token) localStorage.setItem('token', res.token);
        if (res.accessToken) localStorage.setItem('token', res.accessToken);

        return response;
      } catch (error: any) {
        const message = error.response?.data?.message || 'Registration failed';
        authStore.setError(message);
        throw error;
      } finally {
        authStore.setLoading(false);
      }
    },
    [authStore]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    authStore.logout();
  }, [authStore]);

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated, 
    isLoading: authStore.isLoading,
    error: authStore.error,
    isAdmin: authStore.isAdmin(),
    isCustomer: authStore.isCustomer(),
    login,
    register,
    logout,
    checkAuth: authStore.checkAuth,
  };
}