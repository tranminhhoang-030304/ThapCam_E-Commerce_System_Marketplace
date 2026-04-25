import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [UploadController],
  providers: [
    UploadService,
    {
      provide: 'CLOUDINARY',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return cloudinary.config({
          cloud_name: configService.get<string>('CLOUDINARY_CLOUD_NAME'),
          api_key: configService.get<string>('CLOUDINARY_API_KEY'),
          api_secret: configService.get<string>('CLOUDINARY_API_SECRET'),
        });
      },
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}