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
      useFactory: async (configService: ConfigService) => {
        const mailProvider = configService.get<string>('MAIL_PROVIDER', 'smtp');
        
        let transport: any;
        
        if (mailProvider === 'brevo') {
          // Custom Transport dùng Brevo HTTP API (Bypass Render Port 587 Block)
          transport = {
            name: 'BrevoHTTP',
            version: '1.0.0',
            send: async (mail: any, callback: any) => {
              try {
                const { from, to, subject, html } = mail.data;
                
                // Format To (Người nhận)
                let toList: any[] = [];
                if (typeof to === 'string') {
                  toList.push({ email: to });
                } else if (Array.isArray(to)) {
                  toList = to.map(t => typeof t === 'string' ? { email: t } : { email: t.address, name: t.name });
                } else if (to && to.address) {
                  toList.push({ email: to.address, name: to.name });
                }

                // Format Sender (Người gửi)
                let sender = { name: 'ThapCam E-Commerce', email: configService.get<string>('MAIL_USER') };
                if (typeof from === 'string') {
                   const match = from.match(/(.*)<(.*)>/);
                   if (match) {
                      sender = { name: match[1].replace(/['"]/g, '').trim() || 'ThapCam', email: match[2].trim() };
                   } else {
                      sender = { name: 'ThapCam', email: from };
                   }
                } else if (from && from.address) {
                   sender = { name: from.name || 'ThapCam', email: from.address };
                }

                const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                  method: 'POST',
                  headers: {
                    'accept': 'application/json',
                    'api-key': configService.get<string>('BREVO_API_KEY') || '',
                    'content-type': 'application/json'
                  },
                  body: JSON.stringify({
                    sender,
                    to: toList,
                    subject,
                    htmlContent: html
                  })
                });

                if (!response.ok) {
                  const errorData = await response.text();
                  throw new Error(`Brevo API Error: ${response.status} - ${errorData}`);
                }

                const data = await response.json();
                callback(null, data);
              } catch (error) {
                callback(error);
              }
            }
          };
        } else {
          // Transport mặc định: SMTP (Dùng cho Local)
          transport = {
            host: configService.get<string>('MAIL_HOST'), 
            port: configService.get<number>('MAIL_PORT') || 587,
            secure: configService.get<string>('MAIL_SECURE') === 'true',
            family: 4,
            auth: {
              user: configService.get<string>('MAIL_USER'),
              pass: configService.get<string>('MAIL_PASS'),
            },
            tls: {
              rejectUnauthorized: false,
            },
          };
        }

        return {
          transport,
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
        };
      },
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}