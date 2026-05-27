import { Injectable, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { HttpService } from '@nestjs/axios';
import { UploadService } from '../upload/upload.service'; // Tái sử dụng UploadService của sếp
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    private httpService: HttpService,
    private uploadService: UploadService,
  ) {}

  async processReview(
    userId: string,
    createReviewDto: CreateReviewDto,
    files: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
    // 1. Gọi API sang khối OMS (Spring Boot) để check điều kiện mua hàng
    // (Giả sử Spring Boot chạy ở port 8080 và có API này)
    try {
      const omsResponse = await firstValueFrom(
        this.httpService.get(`http://localhost:8080/api/orders/check-purchase`, {
          params: { userId, productId: createReviewDto.productId },
        }),
      );
      
      if (!omsResponse.data.hasPurchased) {
        throw new ForbiddenException('Bạn phải mua sản phẩm này và đã nhận hàng mới được đánh giá!');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException('Lỗi kết nối đến hệ thống kiểm tra đơn hàng (OMS).');
    }

    // 2. Xử lý Upload Ảnh & Video lên Cloudinary
    const imageUrls: string[] = [];
    const videoUrls: string[] = [];

    if (files.images && files.images.length > 0) {
      for (const file of files.images) {
        // Giả sử sếp có hàm uploadImage trong UploadService
        const result = await this.uploadService.uploadImage(file); 
        imageUrls.push(result.secure_url);
      }
    }

    if (files.videos && files.videos.length > 0) {
      for (const file of files.videos) {
        // Cần viết thêm/tái sử dụng hàm uploadVideo bên UploadService
        const result = await this.uploadService.uploadVideo(file);
        videoUrls.push(result.secure_url);
      }
    }

    // 3. Lưu vào Database (PostgreSQL)
    const newReview = this.reviewRepository.create({
      ...createReviewDto,
      userId,
      images: imageUrls,
      videos: videoUrls,
    });

    return await this.reviewRepository.save(newReview);
  }
}