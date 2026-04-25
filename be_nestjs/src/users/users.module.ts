import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity'; 
import { UserProfile } from './entities/user-profile.entity';
import { AuthModule } from '../auth/auth.module';
import { Notification } from './entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, Notification]),
    forwardRef(() => AuthModule) // Dùng forwardRef để tránh lỗi vòng lặp (import chéo)
  ], 
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}