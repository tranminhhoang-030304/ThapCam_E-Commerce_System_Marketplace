import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { ProductVariant } from './product-variant.entity';
import { Review } from './review.entity';

export enum ProductStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  DRAFT = 'draft',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  sku: string; // Mã định danh kho: VD: APPLE-VP-2025

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 20, scale: 3 })
  price: number;

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @Column({ default: 0 })
  stock_quantity: number;

  @Column({ type: 'text', nullable: true })
  image_url: string;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Category, (category) => category.products, { 
    eager: true, // Cực kỳ quan trọng: Tự động JOIN lấy thông tin Category mỗi khi query Product
    onDelete: 'SET NULL' // Nếu lỡ xóa danh mục thì sản phẩm không bị xóa theo, chỉ bị mất danh mục
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  // Quan hệ 1-Nhiều: 1 Sản phẩm có nhiều Biến thể
  // cascade: true -> Cho phép tạo Sản phẩm kèm theo các Biến thể cùng lúc
  @OneToMany(() => ProductVariant, (variant) => variant.product, { cascade: true })
  variants: ProductVariant[];
}