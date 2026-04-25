import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class UploadService {
  uploadFile(file: Express.Multer.File, folder: string = 'thapcam_ecommerce'): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new BadRequestException('Không tìm thấy file!'));

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folder }, // Lưu vào thư mục riêng trên Cloudinary cho gọn
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      // Bắn luồng dữ liệu lên mây
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}