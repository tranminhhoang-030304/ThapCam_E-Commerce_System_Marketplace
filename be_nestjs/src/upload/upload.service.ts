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

  // 1. HÀM UPLOAD ẢNH
  uploadImage(file: Express.Multer.File, folder: string = 'thapcam_reviews_img'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new BadRequestException('Không tìm thấy file ảnh!'));

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folder, resource_type: 'image' }, // Chỉ định rõ đây là ảnh
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  // 2. HÀM UPLOAD VIDEO (phải có resource_type: 'video')
  uploadVideo(file: Express.Multer.File, folder: string = 'thapcam_reviews_vid'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new BadRequestException('Không tìm thấy file video!'));

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folder, resource_type: 'video' }, //Báo cho Cloudinary biết đây là Video
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}