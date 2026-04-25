import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {}

  // Lấy danh sách toàn bộ khách hàng
  async findAll() {
    const users = await this.usersRepository.find({
      relations: ['profile'],
      order: { id: 'DESC' } // Xếp người mới đăng ký lên đầu
    });
    
    // Tuyệt đối không trả về cột password
    return users.map(user => {
      const { password_hash, ...safeUser } = user as any;
      return safeUser;
    });
  }

  // Thêm vào trong UsersService
  async findByEmail(email: string) {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { id } });
  }

  // Hàm tìm user để lát nữa check lúc Đăng nhập
  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  // Hàm lưu user mới lúc Đăng ký
  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(userData);
    return this.usersRepository.save(newUser);
  }

  // Lấy Profile của User đang đăng nhập
  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'], // Load luôn cả cục profile lên
    });

    if (!user) throw new NotFoundException('User không tồn tại');

    // Nếu user chưa có profile (mới đăng ký), trả về rỗng thay vì báo lỗi
    return user.profile || { full_name: user.full_name, phone_number: '', address: '', avatar_url: '' };
  }

  // Cập nhật Profile (Tạo mới nếu chưa có)
  async updateProfile(userId: string, profileData: any) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException('User không tồn tại');

    //Bỏ 'id' và các trường nhạy cảm do Frontend gửi nhầm lên
    const { id, user_id, created_at, updated_at, ...safeData } = profileData;

    if (user.profile) {
      // Đã có profile -> Cập nhật
      Object.assign(user.profile, safeData);
      await this.userProfileRepository.save(user.profile); 
    } else {
      // Chưa có profile -> Tạo mới tinh
      const newProfile = this.userProfileRepository.create(safeData as Partial<UserProfile>);
      newProfile.user = user;
      await this.userProfileRepository.save(newProfile);
    }
    
    return { message: 'Cập nhật hồ sơ thành công', profile: user.profile };
  }

  // 1. Lưu mã khôi phục vào Database
  async saveResetToken(userId: string, token: string, expiresAt: Date) {
    await this.usersRepository.update(userId, {
      reset_token: token,
      reset_token_expires: expiresAt,
    });
  }

  // 2. Tìm User dựa trên mã khôi phục
  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { reset_token: token } });
  }

  // 3. Cập nhật mật khẩu mới và Hủy luôn cái mã khôi phục đó
  async updatePasswordAndClearToken(userId: string, newPasswordHash: string) {
    await this.usersRepository.update(userId, {
      password_hash: newPasswordHash,
      reset_token: null as any, // Đổi xong thì xóa Token đi để chống dùng lại
      reset_token_expires: null as any,
    });
  }

  // Lưu Refresh Token vào DB
  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.usersRepository.update(userId, {
      refresh_token: refreshToken,
    });
  }
}