import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  productId: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  @Column('int')
  rating: number; // Lưu số sao từ 1 đến 5

  @Column('text')
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Product, product => product.reviews, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}