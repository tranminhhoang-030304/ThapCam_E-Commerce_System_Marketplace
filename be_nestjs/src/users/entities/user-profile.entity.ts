import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  full_name: string;

  @Column({ nullable: true })
  phone_number: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  avatar_url: string;

  // Nối 1-1 với bảng users, nếu user bị xóa thì profile cũng bay màu (CASCADE)
  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}