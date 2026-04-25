import { create } from 'zustand';

interface CartUIState {
  isCartOpen: boolean;
  cartItemCount: number;

  // Actions
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setCartItemCount: (count: number) => void;
}

export const useCartUIStore = create<CartUIState>((set) => ({
  isCartOpen: false,
  cartItemCount: 0,

  openCart: () => set({ isCartOpen: true }),

  closeCart: () => set({ isCartOpen: false }),

  toggleCart: () =>
    set((state) => ({
      isCartOpen: !state.isCartOpen,
    })),

  setCartItemCount: (count: number) =>
    set({
      cartItemCount: count,
    }),
}));
