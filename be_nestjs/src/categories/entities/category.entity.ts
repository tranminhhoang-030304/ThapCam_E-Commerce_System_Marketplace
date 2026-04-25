import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // VD: Đồ điện tử, Thời trang

  @Column({ unique: true })
  slug: string; // VD: do-dien-tu (Để làm URL đẹp cho SEO)

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}