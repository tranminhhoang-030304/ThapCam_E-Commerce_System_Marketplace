import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { UserProfile } from './user-profile.entity';

export enum UserRole {
  ADMIN = 'ROLE_ADMIN',
  CUSTOMER = 'ROLE_CUSTOMER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password_hash: string;

  @Column({ unique: true })
  email: string;

  @Column()
  full_name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ nullable: true })
  reset_token: string;

  @Column({ type: 'timestamp', nullable: true })
  reset_token_expires: Date;

  @Column({ nullable: true })
  refresh_token: string;

  @Column({ type: 'timestamp', nullable: true })
  refresh_token_expires: Date;

  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile: UserProfile;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}