import { Controller, Post, Body, UseInterceptors, UploadedFiles, UseGuards, Req } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Đường dẫn dựa theo cây thư mục của sếp

@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard) // Guard bắt buộc đăng nhập
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 3 }, // Khách được up tối đa 3 ảnh
      { name: 'videos', maxCount: 1 }, // Khách được up tối đa 1 video
    ]),
  )
  async createReview(
    @Req() req: any,
    @Body() createReviewDto: CreateReviewDto,
    @UploadedFiles() files: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
    const userId = req.user.id; // Lấy ra ID người dùng từ JWT Token
    return this.reviewsService.processReview(userId, createReviewDto, files);
  }
}