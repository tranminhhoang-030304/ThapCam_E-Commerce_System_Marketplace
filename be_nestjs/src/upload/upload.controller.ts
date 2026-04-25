import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng đính kèm một bức ảnh!');
    }
    
    // Kiểm tra định dạng (Chỉ cho phép ảnh)
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      throw new BadRequestException('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP)!');
    }

    // Kiểm tra dung lượng (Ví dụ: Giới hạn 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Kích thước ảnh không được vượt quá 5MB!');
    }

    try {
      const result = await this.uploadService.uploadFile(file, 'avatars');
      return {
        message: 'Upload thành công!',
        url: result.secure_url,
      };
    } catch (error) {
      throw new BadRequestException('Upload thất bại: ' + error.message);
    }
  }
}