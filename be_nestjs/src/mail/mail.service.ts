import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  // 1. Gửi Email khôi phục mật khẩu
  async sendResetPassword(email: string, name: string, resetLink: string) {
    const timeString = new Date().toLocaleTimeString('vi-VN');
    await this.mailerService.sendMail({
      to: email,
      subject: `🔑 Khôi phục mật khẩu - ThapCam E-Commerce (${timeString})`,
      template: './reset-password', // Tên file template .ejs
      context: { name: name || 'Quý khách hàng', resetLink: resetLink, timeString: timeString },
    });
  }

  // 2. Gửi Email hóa đơn thanh toán thành công
  async sendInvoice(email: string, name: string, orderId: string, amount: number) {
    await this.mailerService.sendMail({
      to: email,
      subject: `[ThapCam] Hóa đơn điện tử đơn hàng #${orderId}`,
      template: './invoice',
      context: { 
        name: name || 'Quý khách', 
        orderId, 
        amount: new Intl.NumberFormat('vi-VN').format(amount) 
      },
    });
  }

  // 3. Gửi Email chào mừng thành viên mới + Tặng mã Tân thủ
  async sendWelcome(email: string, name: string, voucherCode: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: '🎉 Chào mừng sếp gia nhập ThapCam! Quà ra mắt đã sẵn sàng',
      template: './welcome',
      context: { 
        name: name || 'Thành viên mới', 
        voucherCode,
        shopLink: `http://localhost:3000/checkout?voucherCode=${voucherCode}` 
      },
    });
  }

  // 4. Gửi Email thông báo Hủy đơn / Hoàn tiền
  async sendRefund(email: string, name: string, orderId: string, amount: number, reason: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: `[ThapCam] Thông báo hoàn tiền đơn hàng #${orderId}`,
      template: './refund',
      context: { 
        name: name || 'Quý khách', 
        orderId, 
        amount: new Intl.NumberFormat('vi-VN').format(amount),
        reason: reason || 'Hết hàng trong kho (Auto-Refunded)'
      },
    });
  }

  // 5. Gửi Email Giải cứu giỏ hàng (Tặng Voucher)
  async sendAbandonedCartVoucher(email: string, name: string, voucherCode: string, discountValue: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: `🚨 Bạn để quên đồ trong giỏ hàng kìa! ThapCam tặng bạn mã giảm ${discountValue}`,
      template: './abandoned-cart', // Lát nữa mình tạo file này
      context: { 
        name: name || 'Quý khách', 
        voucherCode, 
        discountValue,
        shopLink: `http://localhost:3000/checkout?voucherCode=${voucherCode}`
      },
    });
  }

  // 6. Gửi Email Tri ân Khách hàng VIP
  async sendVipRewardEmail(email: string, name: string, voucherCode: string, discountValue: string, totalAmount: string) {
    // Format lại số tiền nhìn cho sang (VD: 10000000 -> 10.000.000 ₫)
    const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(totalAmount));

    await this.mailerService.sendMail({
      to: email,
      subject: `🌟 Trân trọng cảm ơn Khách hàng VIP! ThapCam tặng bạn mã giảm ${discountValue}`,
      template: './vip-reward',
      context: { 
        name: name || 'Quý khách', 
        voucherCode, 
        discountValue,
        formattedAmount,
        // Cắm sẵn link có mã giống hệt vụ Giải cứu giỏ hàng để auto-apply
        shopLink: `http://localhost:3000/checkout?voucherCode=${voucherCode}` 
      },
    });
  }
}