import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRole } from '../users/entities/user.entity';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject('RABBITMQ_CLIENT') private readonly rabbitClient: ClientProxy,
    @Inject('SPRING_BOOT_CLIENT') private readonly springClient: ClientProxy,
    private configService: ConfigService,
  ) {}

  // 1. ĐĂNG KÝ
  async register(username: string, password_plain: string, email: string, full_name: string) {
    // ĐỔI SANG CHECK TRÙNG BẰNG EMAIL
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new BadRequestException('Email này đã tồn tại!');
    }
    // Băm mật khẩu (Hash)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password_plain, saltRounds);
    // Lưu xuống DB
    const newUser = await this.usersService.create({
      username,       // Cái này giờ đã được tự động sinh từ Controller
      password_hash,
      email,
      full_name,      // Đã khớp với data từ Frontend
      role: UserRole.CUSTOMER, 
    });
    this.springClient.emit('user_registered', {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.full_name
    });
    return { message: 'Đăng ký thành công!', userId: newUser.id };
  }

  // 2. ĐĂNG NHẬP & NHẢ JWT
  async login(email: string, password_plain: string) {
    // Tìm user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu!');
    }

    // So sánh mật khẩu
    const isPasswordMatch = await bcrypt.compare(password_plain, user.password_hash);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu!');
    }

    // Nếu đúng, tạo JWT Token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign({ ...payload }, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign({ ...payload }, { expiresIn: '7d' });
    await this.usersService.saveRefreshToken(user.id, refreshToken);

    return {
      message: 'Đăng nhập thành công!',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        username: user.username,
      }
    };
  }

  // 3. ĐỔI THẺ MỚI BẰNG REFRESH TOKEN 
  async refreshTokens(refreshToken: string) {
    try {
      // Xác thực chữ ký và hạn của Refresh Token
      const decoded = this.jwtService.verify(refreshToken);
      // Lấy User từ DB ra để kiểm tra xem thẻ này có bị khóa/đổi chưa
      const user = await this.usersService.findById(decoded.sub);
      if (!user || user.refresh_token !== refreshToken) {
        throw new UnauthorizedException('Refresh Token không hợp lệ hoặc đã bị thu hồi!');
      }
      // Tạo cặp thẻ mới
      const payload = { sub: user.id, email: user.email, role: user.role };
      const newAccessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
      // Lưu lại Refresh Token mới vào DB
      await this.usersService.saveRefreshToken(user.id, newRefreshToken);
      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh Token đã hết hạn! Vui lòng đăng nhập lại.');
    }
  }

  // YÊU CẦU QUÊN MẬT KHẨU
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống!');
    }
    // 1. Sinh một chuỗi mã ngẫu nhiên dài 32 bytes (64 ký tự hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    // 2. Set thời hạn cho mã là 15 phút kể từ bây giờ
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    // 3. Lưu vào Database
    await this.usersService.saveResetToken(user.id, resetToken, expiresAt);
    // 4. Bắn tín hiệu sang RabbitMQ để hệ thống gửi Email (Service khác sẽ lo)
    // Tạo một link Frontend để khách bấm vào
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;
    this.rabbitClient.emit('send_reset_password_email', {
      email: user.email,
      name: user.full_name,
      resetLink: resetLink
    });
    console.log(`[HỆ THỐNG] Link đổi pass của ${email} là: ${resetLink}`);
    return { message: 'Vui lòng kiểm tra hòm thư Email để đặt lại mật khẩu!' };
  }

  // XÁC NHẬN ĐỔI MẬT KHẨU MỚI
  async resetPassword(token: string, newPasswordPlain: string) {
    const user = await this.usersService.findByResetToken(token);
    // Check xem token có tồn tại không
    if (!user) {
      throw new BadRequestException('Đường dẫn khôi phục không hợp lệ hoặc đã bị thay đổi!');
    }
    // Check xem token còn hạn 15 phút không
    if (user.reset_token_expires < new Date()) {
      throw new BadRequestException('Đường dẫn khôi phục đã hết hạn! Vui lòng yêu cầu lại.');
    }
    // Băm mật khẩu mới
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPasswordPlain, saltRounds);
    // Lưu pass mới và Hủy token
    await this.usersService.updatePasswordAndClearToken(user.id, newPasswordHash);
    return { message: 'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.' };
  }

  // XỬ LÝ KHÁCH TỪ GOOGLE VỀ
  async googleLogin(googleUser: any) {
    if (!googleUser) throw new BadRequestException('Không nhận được thông tin từ Google');
    let user = await this.usersService.findByEmail(googleUser.email);
    if (!user) {
      // Đăng ký mới nếu chưa có trong Database
      const dummyPassword = Math.random().toString(36).slice(-8); // Sinh pass ngẫu nhiên
      const password_hash = await bcrypt.hash(dummyPassword, 10);
      const username = googleUser.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
      user = await this.usersService.create({
        username,
        password_hash,
        email: googleUser.email,
        full_name: googleUser.fullName,
        role: UserRole.CUSTOMER,
      });
      this.springClient.emit('user_registered', {
        userId: user.id,
        email: user.email,
        name: user.full_name
      });
    }
    // Cấp cặp Token y hệt như hàm login bình thường
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign({ ...payload}, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign({ ...payload}, { expiresIn: '7d' });

    // Lưu thẻ gia hạn vào DB
    await this.usersService.saveRefreshToken(user.id, refreshToken);

    return { access_token: accessToken, refresh_token: refreshToken };
  }
}