import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      // 1. Chỉ đạo máy quét: Hãy tìm Token trong Header "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      
      // 2. Không cho phép dùng thẻ hết hạn
      ignoreExpiration: false,
      
      // 3. Dùng chung chìa khóa bí mật mà anh em mình đã đặt trong .env
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  // 4. Khi quét thẻ thành công, NestJS sẽ ném Payload vào đây
  async validate(payload: any) {
    // Payload này chứa { sub: userId, email, role } mà mình đã đóng gói lúc Login
    const user = await this.usersService.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('Người dùng không còn tồn tại trên hệ thống!');
    }

    // Trả về cục data này để NestJS nhét vào biến req.user
    return { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      full_name: user.full_name 
    };
  }
}