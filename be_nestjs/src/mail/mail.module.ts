import { MailerModule } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { join } from 'path';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [
    forwardRef(() => UsersModule), 
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          // Lấy dữ liệu an toàn qua configService
          host: configService.get<string>('MAIL_HOST'), 
          port: configService.get<number>('MAIL_PORT') || 587,
          secure: configService.get<string>('MAIL_SECURE') === 'true', // Chuyển từ string "false" sang boolean
          // Force IPv4: Render Free Tier không hỗ trợ IPv6 outbound
          // Nếu không có dòng này, nodemailer sẽ resolve smtp.gmail.com → IPv6 → ENETUNREACH
          family: 4,
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },
          tls: {
            rejectUnauthorized: false,
          },
        },
        defaults: {
          from: configService.get<string>('MAIL_FROM') || configService.get<string>('MAIL_USER'),
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new EjsAdapter(),
          options: {
            strict: false,
          },
        },
      }),
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}