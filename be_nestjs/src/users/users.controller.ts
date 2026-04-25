import { Controller, Get, Put, Body, UseGuards, Request, BadRequestException, Query } from '@nestjs/common'; 
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventPattern, Payload } from '@nestjs/microservices';
import { MailerService } from '@nestjs-modules/mailer';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, map } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { SseService } from 'src/sse/sse.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService, 
    private readonly mailerService: MailerService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    private readonly sseService: SseService
  ) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard) // Bắt buộc phải đăng nhập
  @Get('me/profile')
  getProfile(@Request() req) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      console.error('LỖI TOKEN: ', req.user); // In ra để check log xem bên trong Token thực sự có gì
      throw new BadRequestException('Không tìm thấy định danh người dùng trong Token!');
    }
    return this.usersService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/profile')
  updateProfile(@Request() req, @Body() updateData: any) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy định danh người dùng trong Token!');
    }
    return this.usersService.updateProfile(userId, updateData);
  }

  // API LẤY LỊCH SỬ THÔNG BÁO CHO FRONTEND
  @UseGuards(JwtAuthGuard)
  @Get('me/notifications')
  async getMyNotifications(@Request() req) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) throw new BadRequestException('Lỗi Token');
    
    // Lấy 50 thông báo mới nhất từ DB
    return this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }, // Mới nhất lên trên cùng
      take: 50 
    });
  }

  @EventPattern('send_email_notification_queue')
  async handleSendApologyEmail(@Payload() data: { userId: string; orderId: string; reason: string; amount?: number }) {
    console.log(`📧 [RabbitMQ] Nhận lệnh gửi Email xin lỗi cho User: ${data.userId}, Đơn hàng: ${data.orderId}`);
    try {
      const user = await this.usersService.findById(data.userId);
      if (!user || !user.email) {
        console.error('❌ Không tìm thấy email của user này để gửi!');
        return;
      }
      const title = `Đơn hàng ${data.orderId.substring(0, 8)} đã bị hủy`;
      const message = `Hệ thống đã hoàn tiền 100%. Lý do: ${data.reason}.`;

      // 1. Tạo và Lưu đúng 1 lần 
      const newNotif = this.notificationsRepository.create({
        userId: data.userId,
        title: title,
        message: message,
        orderId: data.orderId,
      });
      const savedNotif = await this.notificationsRepository.save(newNotif);
      console.log(`📢 [EventEmitter] Phát sóng thông báo nội bộ cho User: ${data.userId}`);
      // 4. Phát cục savedNotif có kèm ID từ DB luôn cho Frontend
      this.eventEmitter.emit(`notification.${data.userId}`, savedNotif);
      this.eventEmitter.emit('internal.send_refund_email', { 
         email: user.email, 
         name: user.full_name, 
         orderId: data.orderId, 
         amount: data.amount || 0,
         reason: data.reason,
      });
    } catch (error) {
      console.error(`❌ Lỗi khi gửi email:`, error.message);
    }
  }

  @EventPattern('order_status_update_queue')
  async handleOrderStatusUpdate(@Payload() data: { userId: string; orderId: string; status: string; message: string }) {
    console.log(`📢 [RabbitMQ] Nhận lệnh báo trạng thái mới cho Đơn: ${data.orderId} -> ${data.status}`);
    
    try {
      const title = `Cập nhật đơn hàng ${data.orderId.substring(0, 8)}`;
      
      // 1. Lưu vào Database
      const newNotif = this.notificationsRepository.create({
        userId: data.userId,
        title: title,
        message: data.message,
        orderId: data.orderId,
      });
      const savedNotif = await this.notificationsRepository.save(newNotif);

      this.sseService.sendToUser(data.userId, savedNotif);
      console.log(`🔔 [SSE] Đã đẩy thông báo tới user ${data.userId}`);
      
    } catch (error) {
      console.error(`❌ Lỗi khi lưu thông báo trạng thái:`, error.message);
    }
  }

  @EventPattern('send_invoice_email_queue')
  async handleSendInvoiceEmail(@Payload() data: { userId: string; orderId: string; totalAmount: number }) {
    console.log(`🧾 [RabbitMQ] Đang xuất hóa đơn & báo tin cho Đơn hàng: ${data.orderId}`);
    
    try {
      const user = await this.usersService.findById(data.userId);
      if (!user || !user.email) return;

      const shortOrderId = data.orderId.substring(0, 8).toUpperCase();
      const formattedTotal = Number(data.totalAmount).toLocaleString('vi-VN');

      const title = `Thanh toán thành công đơn hàng #${shortOrderId}`;
      const message = `Bạn đã thanh toán thành công ${formattedTotal}đ. Đơn hàng của bạn đang được chuẩn bị.`;

      // 1. LƯU THÔNG BÁO VÀO DATABASE
      const newNotif = this.notificationsRepository.create({
        userId: data.userId,
        title: title,
        message: message,
        orderId: data.orderId,
      });
      const savedNotif = await this.notificationsRepository.save(newNotif);

      // 3. PHÓNG MÁY BAY GIẤY (SSE) CHO FRONTEND
      this.sseService.sendToUser(data.userId, savedNotif);
      this.eventEmitter.emit('internal.send_invoice_email', { 
         email: user.email, 
         name: user.full_name, 
         orderId: data.orderId, 
         amount: data.totalAmount 
      });
      
    } catch (error) {
      console.error(`❌ Lỗi hệ thống khi xử lý hóa đơn:`, error.message);
    }
  }
}