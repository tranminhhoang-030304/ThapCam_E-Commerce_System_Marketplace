import { EventPattern, Payload } from '@nestjs/microservices';
import { MailService } from './mail.service';
import { OnEvent } from '@nestjs/event-emitter';
import { UsersService } from '../users/users.service';
import { Controller, Inject, forwardRef } from '@nestjs/common';

@Controller()
export class MailController {
  constructor(
    private readonly mailService: MailService, 
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService) {}

  // Hứng tín hiệu đổi mật khẩu
  @EventPattern('send_reset_password_email')
  async handleResetPassword(@Payload() data: { email: string; name: string; resetLink: string }) {
    console.log(`📩 Đang gửi email khôi phục tới: ${data.email}`);
    await this.mailService.sendResetPassword(data.email, data.name, data.resetLink);
  }

  // Hứng tín hiệu hóa đơn (Từ queue send_invoice_email_queue)
  @OnEvent('internal.send_invoice_email')
  async handleInvoice(data: { email: string; name: string; orderId: string; amount: number }) {
    console.log(`🧾 [MailModule] Nhận lệnh nội bộ: Gửi mail hóa đơn #${data.orderId}`);
    await this.mailService.sendInvoice(data.email, data.name, data.orderId, data.amount);
  }

  @EventPattern('send_welcome_email')
  async handleWelcome(@Payload() data: { email: string; name: string; voucherCode: string }) {
    console.log(`👋 Đang gửi mail chào mừng và tặng mã ${data.voucherCode} cho: ${data.name}`);
    await this.mailService.sendWelcome(data.email, data.name, data.voucherCode);
  }

  // Hứng tín hiệu hoàn tiền
  @OnEvent('internal.send_refund_email')
  async handleRefund(data: { 
    email: string; 
    name: string; 
    orderId: string; 
    amount: number; 
    reason: string 
  }) {
    console.log(`💸 [MailModule] Nhận lệnh nội bộ: Gửi mail hoàn tiền đơn #${data.orderId}`);
    
    await this.mailService.sendRefund(
      data.email, 
      data.name, 
      data.orderId, 
      data.amount, 
      data.reason
    );
  }

  // HỨNG TÍN HIỆU GIẢI CỨU GIỎ HÀNG
  @EventPattern('send_abandoned_cart_email_queue')
  async handleAbandonedCartEmail(@Payload() payload: any) {
    console.log(`📬 [RabbitMQ] Nhận tín hiệu tặng Voucher Giải cứu giỏ hàng:`, payload);
    const { userId, voucherCode, discountValue } = payload;
    
    try {
      // 1. Tìm Email của khách hàng dựa vào userId
      const user = await this.usersService.findById(userId);
      if (!user) {
        console.error(`❌ Không tìm thấy user có ID: ${userId} để gửi mail!`);
        return;
      }
      // 2. Gửi 
      console.log(`🛒 Đang gửi email tặng mã ${voucherCode} tới: ${user.email}`);
      await this.mailService.sendAbandonedCartVoucher(user.email, user.full_name, voucherCode, discountValue);
    } catch (error) {
      console.error('❌ Lỗi khi gửi mail Giải cứu giỏ hàng:', error);
    }
  }

  // HỨNG TÍN HIỆU TRI ÂN KHÁCH HÀNG VIP
  @EventPattern('send_vip_reward_queue')
  async handleVipRewardEmail(@Payload() payload: any) {
    console.log(`📬 [RabbitMQ] Nhận tín hiệu tri ân Khách hàng VIP:`, payload);
    const { userId, voucherCode, discountValue, totalAmount } = payload;
    
    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        console.error(`❌ Không tìm thấy user VIP có ID: ${userId} để gửi mail!`);
        return;
      }
      
      console.log(`👑 Đang gửi email tri ân VIP kèm mã ${voucherCode} tới: ${user.email}`);
      await this.mailService.sendVipRewardEmail(user.email, user.full_name, voucherCode, discountValue, totalAmount);
      
    } catch (error) {
      console.error('❌ Lỗi khi gửi mail VIP Tri ân:', error);
    }
  }
}