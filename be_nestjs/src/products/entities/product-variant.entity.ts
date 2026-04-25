import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Khóa ngoại liên kết với bảng Products
  // onDelete: 'CASCADE' -> Nếu xóa Sản phẩm mẹ, tự động xóa sạch các biến thể con
  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string; // VD: Đen, Trắng, Xanh...

  @Column({ type: 'varchar', length: 50, nullable: true })
  size: string; // VD: S, M, L, XL...

  // Giá chênh lệch (VD: Size XL đắt hơn 50.000đ thì lưu 50000)
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  price_modifier: number;

  @Column({ type: 'int', default: 0 })
  stock_quantity: number;

  @CreateDateColumn({ name: 'created_at' }) 
created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}