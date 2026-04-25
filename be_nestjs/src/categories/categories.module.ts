import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    AuthModule // Import AuthModule để dùng JwtAuthGuard
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService], // Export để sau này ProductsModule có thể dùng nếu cần
})
export class CategoriesModule {}