import { create } from 'zustand';
import { User, UserRole } from '@/types';
import { AuthService } from '@/services/auth.service';
import { getAuthToken } from '@/lib/axiosClient';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  isAdmin: () => boolean;
  isCustomer: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      error: null,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  logout: () => {
    AuthService.logout();
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const token = getAuthToken();
    
    // If no token, user is not authenticated
    if (!token) {
      set({
        user: null,
        isAuthenticated: false,
      });
      return;
    }

    try {
      set({ isLoading: true });
      
      // Try to get cached user first
      const cachedUser = AuthService.getCachedUser();
      if (cachedUser) {
        set({
          user: cachedUser,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      // If no cache, fetch from API
      const user = await AuthService.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to verify authentication',
      });
    }
  },

  isAdmin: () => {
    const { user } = get();
    return user?.role === UserRole.ADMIN;
  },

  isCustomer: () => {
    const { user } = get();
    return user?.role === UserRole.CUSTOMER;
  },
}));
