import { Controller, Post, Body, Get, UseGuards, Request, BadRequestException, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; 
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    // 1. Frontend gửi 'name' chứ không phải 'full_name'
    const fullName = body.name; 

    // 2. Frontend không gửi 'username', tự sinh username từ phần đầu của email 
    // Ví dụ: test@gmail.com -> username là 'test_1234'
    const generatedUsername = body.email.split('@')[0] + '_' + Math.floor(Math.random() * 10000);

    // Truyền dữ liệu xuống Service
    return this.authService.register(
      generatedUsername, 
      body.password, 
      body.email, 
      fullName 
    );
  }

  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  //API KHÔI PHỤC TRẠNG THÁI ĐĂNG NHẬP CHO FRONTEND
  @UseGuards(JwtAuthGuard) // phải có Token mới được vào
  @Get('me')
  getProfile(@Request() req) {
    // Khi đi qua JwtAuthGuard thành công, NestJS sẽ tự động giải mã Token 
    // và nhét thông tin user vào biến req.user. FE chỉ việc lôi ra trả về!
    return req.user;
  }

  //Bấm nút "Quên mật khẩu" -> Gửi Email
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  //Nhập mật khẩu mới -> Xác nhận đổi
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  // MỞ THÊM CỔNG ĐỔI THẺ MỚI (Refresh Token)
  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    if (!body.refresh_token) {
      throw new BadRequestException('Thiếu Refresh Token!');
    }
    return this.authService.refreshTokens(body.refresh_token);
  }

  // CỔNG 1: Khách bấm nút sẽ gọi vào đây, NestJS sút khách sang trang Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  // CỔNG 2: Khách cấp quyền xong, Google ném khách về lại đây
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    // Khách về mang theo profile, đưa cho AuthService xử lý
    const tokens = await this.authService.googleLogin(req.user);

    // Xử lý xong, KHÁCH VỀ LẠI FRONTEND kèm theo 2 cái thẻ (Access và Refresh)
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/auth/login?accessToken=${tokens.access_token}&refreshToken=${tokens.refresh_token}`);
  }
}