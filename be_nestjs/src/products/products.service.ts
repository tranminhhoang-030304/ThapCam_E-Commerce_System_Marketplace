import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductVariant } from './entities/product-variant.entity';
import { Review } from './entities/review.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantsRepository: Repository<ProductVariant>,
    private dataSource: DataSource,
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
  ) {}

  // Thêm mới sản phẩm
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, ...productData } = createProductDto;
    // 1. Tạo một cái vỏ rỗng chuẩn Entity Product (TS sẽ tự hiểu đây là 1 Product đơn)
    const newProduct = this.productsRepository.create();
    // 2. Bơm dữ liệu từ DTO vào cái vỏ đó
    Object.assign(newProduct, productData);
    // 3. Gắn thêm Danh mục (Category)
    if (categoryId) {
      newProduct.category = { id: categoryId } as any;
    }
    // 4. Lưu xuống DB
    return this.productsRepository.save(newProduct);
  }

  // HÀM LẤY REVIEW TỪ BẢNG PRODUCT
  async getProductReviews(productId: string) {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
      relations: ['reviews'], // Lôi cổ luôn mảng reviews ra
    });

    if (!product || !product.reviews) return [];

    // Sắp xếp để comment mới nhất hiện lên trên cùng
    return product.reviews.sort((a: any, b: any) => {
      const timeA = new Date(a.createdAt || a['created_at']).getTime();
      const timeB = new Date(b.createdAt || b['created_at']).getTime();
      return timeB - timeA;
    });
  }

  async findAll(query: any) {
  
    const { page = 1, limit = 10, search, categoryId, status } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productsRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .skip(skip)
      .take(limit);

    // Tìm kiếm theo tên hoặc SKU
    if (search) {
      queryBuilder.andWhere('(product.name ILIKE :search OR product.sku ILIKE :search)', { 
        search: `%${search}%` 
      });
    }

    // Lọc theo Danh mục
    if (categoryId) {
      queryBuilder.andWhere('product.category_id = :categoryId', { categoryId });
    }

    // Lọc theo trạng thái (Mặc định Admin xem hết, khách chỉ xem Active)
    if (status) {
      queryBuilder.andWhere('product.status = :status', { status });
    }
    queryBuilder.leftJoinAndSelect('product.reviews', 'reviews');
    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: items,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / limit),
      },
    };
  }

  // Lấy chi tiết 1 sản phẩm
  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id }, relations: ['category', 'variants'] });
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm với id ${id}`);
    return product;
  }

  // Cập nhật sản phẩm
  async update(id: string, updateProductDto: any): Promise<Product> {
    const product = await this.findOne(id);
    const { categoryId, ...productData } = updateProductDto; 
    Object.assign(product, productData);
    if (categoryId) {
      product.category = { id: categoryId } as any;
    }
    return this.productsRepository.save(product);
  }

  // Xóa sản phẩm
  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }
  
  // Thêm 1 biến thể cho sản phẩm
  async addVariant(productId: string, variantData: any): Promise<ProductVariant> {
    const product = await this.findOne(productId); // Đảm bảo sp tồn tại
    // 1. Tạo vỏ rỗng (TypeScript tự hiểu đây là 1 ProductVariant đơn)
    const newVariant = this.variantsRepository.create();
    // 2. Bơm dữ liệu từ DTO vào vỏ
    Object.assign(newVariant, variantData);
    // 3. Gắn khóa ngoại (Sản phẩm cha)
    newVariant.product = product;
    // 4. Lưu xuống DB
    return this.variantsRepository.save(newVariant);
  }

  // Cập nhật 1 biến thể (VD: đổi giá, cập nhật tồn kho)
  async updateVariant(variantId: string, variantData: any): Promise<ProductVariant> {
    const variant = await this.variantsRepository.findOne({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Không tìm thấy biến thể này');
    
    Object.assign(variant, variantData);
    return this.variantsRepository.save(variant);
  }

  // Xóa 1 biến thể
  async removeVariant(variantId: string): Promise<void> {
    const variant = await this.variantsRepository.findOne({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Không tìm thấy biến thể này');
    await this.variantsRepository.remove(variant);
  }

  // HÀM RABBITMQ TRỪ TỒN KHO
  async subtractStock(productId: string, quantity: number) {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(Product) // Update bảng Products
      .set({ 
        stock_quantity: () => `stock_quantity - ${quantity}`
      })
      .where('id = :id', { id: productId })
      .andWhere('stock_quantity >= :quantity', { quantity }) // Ép điều kiện chống bán âm
      .execute();
    if (result.affected === 0) {
      throw new BadRequestException(
        `Không thể trừ kho! Sản phẩm chính [${productId}] không tồn tại hoặc không còn đủ ${quantity} cái.`
      );
    }
    console.log(`✅ Trừ thành công ${quantity} SP gốc (Không có biến thể). Product ID: ${productId}`);
  }

  async deductStock(variantId: string, quantity: number) {
    // Không dùng cách "find -> trừ RAM -> save" vì sẽ bị lỗi Race Condition.
    // Phải bắt TypeORM sinh ra câu SQL: UPDATE product_variants SET stock_quantity = stock_quantity - qty WHERE id = ? AND stock_quantity >= qty
    
    const result = await this.dataSource
      .createQueryBuilder()
      .update(ProductVariant)
      .set({ 
        stock_quantity: () => `stock_quantity - ${quantity}` // Bắt Postgres tự lấy số mới nhất trừ đi
      })
      .where('id = :id', { id: variantId })
      .andWhere('stock_quantity >= :quantity', { quantity }) // ĐIỀU KIỆN SỐNG CÒN: Chỉ trừ khi kho còn đủ hàng
      .execute();

    // Nếu affected === 0 tức là 1 trong 2 trường hợp: Sai ID biến thể HOẶC Hết hàng
    if (result.affected === 0) {
      throw new BadRequestException(
        `Không thể trừ kho! Biến thể [${variantId}] không tồn tại hoặc trong kho không còn đủ ${quantity} sản phẩm.`
      );
    }

    console.log(`✅ Trừ thành công ${quantity} sản phẩm. Variant ID: ${variantId}`);
  }

  // HÀM RABBITMQ TRẢ LẠI KHO (Rollback)
  async addBackStock(variantId: string, quantity: number) {
    // Logic y hệt trừ kho, nhưng thay dấu trừ (-) thành dấu cộng (+)
    const result = await this.dataSource
      .createQueryBuilder()
      .update(ProductVariant)
      .set({ 
        stock_quantity: () => `stock_quantity + ${quantity}` // Cộng lại số lượng
      })
      .where('id = :id', { id: variantId })
      .execute();

    if (result.affected === 0) {
      // Trường hợp này hiếm, trừ khi ID biến thể bị sai
      throw new BadRequestException(`Không tìm thấy biến thể [${variantId}] để hoàn trả.`);
    }
    console.log(`✅ Đã trả lại ${quantity} sản phẩm vào kho Variant: ${variantId}`);
  }

  async restoreStock(productId: string, quantity: number) {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(Product)
      .set({ 
        stock_quantity: () => `stock_quantity + ${quantity}`
      })
      .where('id = :id', { id: productId })
      .execute();

    if (result.affected === 0) {
      throw new BadRequestException(`Không tìm thấy sản phẩm chính [${productId}] để hoàn trả.`);
    }
    console.log(`✅ Đã trả lại ${quantity} sản phẩm vào kho Product: ${productId}`);
  }

  async createReview(userId: string, productId: string, rating: number, comment: string) {
    const newReview = this.reviewsRepository.create({
      userId,
      productId,
      rating,
      comment,
    });
    return await this.reviewsRepository.save(newReview);
  }

  // HÀM LẤY TOÀN BỘ ĐÁNH GIÁ CỦA 1 USER
  async getReviewsByUser(userId: string) {
    return await this.reviewsRepository.find({
      where: { userId },
      relations: ['product'],
      order: { id: 'DESC' }, 
    });
  }

  // Hàm lấy Review cho Tab Products (Cần biết do KHÁCH HÀNG nào viết)
  async getReviewsByProduct(productId: string) {
    return await this.reviewsRepository.find({
      where: { product: { id: productId } },
      relations: ['user', 'user.profile'],
      order: { createdAt: 'DESC' }
    });
  }
}
