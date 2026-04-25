import { springApi } from '@/lib/axiosClient';
import { Cart, AddToCartRequest } from '@/types';
import { API_ENDPOINTS } from '@/lib/constants';

export class CartService {
  private static formatCartData(backendData: any): Cart {
    if (!backendData || !backendData.items) {
      return { id: 'cart', userId: 'user', items: [], totalPrice: 0, createdAt: '', updatedAt: '' };
    }
    const formattedItems = backendData.items.map((item: any) => ({
      //  Tạo ID duy nhất bằng cách ghép productId và variantId
      id: item.variantId ? `${item.productId}-${item.variantId}` : item.productId,
      productId: item.productId,
      variantId: item.variantId, //Bổ sung 
      quantity: item.quantity,
      originalPrice: item.originalPrice || 0,
      finalPrice: item.finalPrice || 0,
      discountNote: item.discountNote || '',
      itemTotal: item.itemTotal || 0,
      product: {
        id: item.productId,
        name: item.productName || 'Sản phẩm',
        price: item.originalPrice || item.price || 0,
        image_url: item.imageUrl || '', 
        description: '',
        stock_quantity: 100,
      }
    }));
    const totalPrice = formattedItems.reduce((sum: number, item: any) => sum + (item.product.price * item.quantity), 0);
    return {
      id: 'cart-1',
      userId: 'user-1',
      items: formattedItems,
      totalOriginalPrice: backendData.totalOriginalPrice || 0,
      totalVolumeDiscount: backendData.totalVolumeDiscount || 0,
      totalPrice: backendData.finalTotal || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  static async getCart(): Promise<Cart> {
    const response = await springApi.get(API_ENDPOINTS.CART_GET);
    return this.formatCartData(response.data);
  }
  static async addToCart(payload: AddToCartRequest): Promise<Cart> {
    const response = await springApi.post(API_ENDPOINTS.CART_ADD_ITEM, payload);
    return this.formatCartData(response.data);
  }
  // thêm variantId và truyền lên URL cho Spring Boot
  static async removeFromCart(productId: string, variantId?: string): Promise<Cart> {
    const url = variantId 
      ? `${API_ENDPOINTS.CART_REMOVE_ITEM(productId)}?variantId=${variantId}`
      : API_ENDPOINTS.CART_REMOVE_ITEM(productId);
    const response = await springApi.delete(url);
    return this.formatCartData(response.data);
  }
  // thêm variantId vào Body gửi xuống
  static async updateCartItem(productId: string, quantity: number, variantId?: string): Promise<Cart> {
    const response = await springApi.put(API_ENDPOINTS.CART_UPDATE_ITEM(productId), { 
      quantity, 
      variantId 
    });
    return this.formatCartData(response.data);
  }
}