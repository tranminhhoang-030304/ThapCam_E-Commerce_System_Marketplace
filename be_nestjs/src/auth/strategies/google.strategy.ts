import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
      scope: ['email', 'profile'], // Xin Google cấp quyền đọc Email và Profile
    });
  }

  // Khách đi chơi Google về sẽ xách theo cái balo (profile) ném vào hàm này
  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails, photos } = profile;
    
    // Gói ghém lại thành 1 cục data gọn gàng đưa cho hệ thống mình xử lý
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      fullName: name.givenName + ' ' + name.familyName,
      picture: photos[0].value,
      accessToken,
    };
    
    // Trả khách qua cửa kiểm duyệt
    done(null, user);
  }
}