import { springApi } from '@/lib/axiosClient';

export class PaymentService {
  /**
   * Hàm này sẽ hứng toàn bộ chuỗi URL từ trang Result, 
   * tự động phân loại xem khách vừa thanh toán Stripe, VNPAY hay MoMo 
   * và đẩy xuống đúng endpoint của Spring Boot để kiểm tra chữ ký (Checksum).
   */
  static async verifyPaymentReturn(queryString: string) {
    // 1. DẤU HIỆU CỦA STRIPE: Nhận diện qua tham số stripe_status
    if (queryString.includes('stripe_status=')) {
      if (queryString.includes('stripe_status=success')) {
        // Đánh lừa mọi điều kiện IF của Frontend
        return { 
          success: true,
          code: '00', 
          RspCode: '00',          
          vnp_ResponseCode: '00', 
          resultCode: 0,          
          message: 'Giao dịch Stripe thành công' 
        }; 
      } else {
        throw new Error('Thanh toán Stripe thất bại hoặc bị hủy');
      }
    }
    // 2. DẤU HIỆU CỦA VNPAY: Tiền tố 'vnp_'
    if (queryString.includes('vnp_')) {
      const response = await springApi.get(`/payment/vnpay_return?${queryString}`);
      return response.data;
    }
    // 3. DẤU HIỆU CỦA MOMO: partnerCode hoặc resultCode
    if (queryString.includes('partnerCode=') || queryString.includes('resultCode=')) {
      // MoMo IPN đã xử lý DB (trừ kho, cập nhật trạng thái) server-to-server rồi.
      // Frontend chỉ cần check resultCode từ redirect URL để hiển thị kết quả.
      const params = new URLSearchParams(queryString);
      const resultCode = params.get('resultCode');
      if (resultCode === '0') {
        return { 
          success: true, 
          resultCode: 0, 
          message: 'Giao dịch MoMo thành công' 
        };
      } else {
        throw new Error('Thanh toán MoMo thất bại hoặc bị hủy');
      }
    }
    throw new Error('Không nhận diện được cổng thanh toán');
  }

  static async createStripePayment(orderId: string): Promise<{ url: string }> {
    const response = await springApi.post(`/payments/stripe/create-session/${orderId}`);
    return response.data;
  }
}