import { create } from 'zustand';

interface AppState {
    user: any | null;       // Thông tin user đã đăng nhập
    cartCount: number;      // Số lượng đồ trong giỏ
    
    // Các hàm thay đổi state
    login: (userData: any, token: string) => void;
    logout: () => void;
    setCartCount: (count: number) => void;
}

export const useStore = create<AppState>((set) => ({
    user: null,
    cartCount: 0,

    login: (userData, token) => {
        localStorage.setItem('access_token', token);
        set({ user: userData });
    },

    logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, cartCount: 0 });
    },

    setCartCount: (count) => set({ cartCount: count }),
}));