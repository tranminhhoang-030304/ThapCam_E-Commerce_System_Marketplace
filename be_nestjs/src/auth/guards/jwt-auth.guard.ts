import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) throw new UnauthorizedException('Không tìm thấy Token. Vui lòng đăng nhập!');

    try {
      // Giải mã token và gắn thông tin user vào request
      const payload = await this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET });
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ!');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}