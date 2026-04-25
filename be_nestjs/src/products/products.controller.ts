import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, Inject, Request, UseInterceptors } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EventPattern, Payload, ClientProxy } from '@nestjs/microservices';
import { CreateVariantDto } from './dto/variant.dto';
import { CacheInterceptor, CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    // Inject công cụ phát tín hiệu vào
    @Inject('RABBITMQ_CLIENT') private readonly rabbitClient: ClientProxy, 
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  // DÀNH CHO KHÁCH HÀNG 
  @UseInterceptors(CacheInterceptor)
  @Get()
  findAll(@Query() query: any) { // Hứng các tham số từ URL (ví dụ: ?page=1&search=abc)
    return this.productsService.findAll(query); // Truyền vào Service
  }

  @Get(':id/reviews')
  async getProductReviews(@Param('id') id: string) {
    // Gọi hàm getReviewsByProduct mà sếp đã viết trong Service
    return this.productsService.getReviewsByProduct(id);
  }

  @UseInterceptors(CacheInterceptor)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // DÀNH CHO ADMIN (Phải có Token và role ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async create(@Body() createProductDto: any) {
    const result = await this.productsService.create(createProductDto);
    await this.cacheManager.clear(); 
    return result;
  }
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateProductDto: any) {
    const result = await this.productsService.update(id, updateProductDto);
    await this.cacheManager.clear(); 
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.productsService.remove(id);
    await this.cacheManager.clear(); 
    return result;
  }

  // API MỚI CHO GÓC NHÌN 360 ĐỘ KHÁCH HÀNG
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('reviews/user/:userId')
  async getUserReviews(@Param('userId') userId: string) {
    return this.productsService.getReviewsByUser(userId);
  }

  @EventPattern('inventory_update_queue')
  async handleInventoryUpdate(@Payload() data: { orderId: string; productId: string; variantId?: string | null; quantity: number }) {
    console.log(`📦 [RabbitMQ] Lệnh trừ kho: Đơn[${data.orderId}] - Product[${data.productId}] - SL: ${data.quantity}`);
    
    try {
      if (data.variantId) {
        await this.productsService.deductStock(data.variantId, data.quantity);
      } else {
        await this.productsService.subtractStock(data.productId, data.quantity);
      }
      await this.cacheManager.clear();
    } catch (error) {
      console.error(`❌ [RabbitMQ] Lỗi trừ kho:`, error.message);
      // Bắn tín hiệu SOS về lại cho Spring Boot
      console.log(`🚨 Báo cáo Spring Boot: Hủy đơn hàng ${data.orderId} ngay!`);
      this.rabbitClient.emit('order_refund_queue', { 
        orderId: data.orderId, 
        reason: 'OUT_OF_STOCK',
        failedProductId: data.productId, // Chỉ điểm Product
        failedVariantId: data.variantId || null // Chỉ điểm Variant
      });
    }
  }

  @EventPattern('inventory_rollback_queue')
  async handleInventoryRollback(@Payload() data: { orderId: string; productId: string; variantId?: string | null; quantity: number }) {
    console.log(`⏪ [RabbitMQ] Lệnh QUAY XE (Rollback): Đơn[${data.orderId}] - Cần trả lại kho SL: +${data.quantity}`);
    
    try {
      if (data.variantId) {
        // Sếp nhớ viết thêm hàm addBackStock trong products.service.ts nhé (Logic giống hệt trừ kho nhưng thay dấu - thành +)
        await this.productsService.addBackStock(data.variantId, data.quantity);
        console.log(`✅ Đã hoàn trả kho thành công cho Variant: ${data.variantId}`);
      } else {
        // Tương tự, viết thêm hàm restoreStock trong products.service.ts
        await this.productsService.restoreStock(data.productId, data.quantity);
        console.log(`✅ Đã hoàn trả kho thành công cho Product: ${data.productId}`);
      }
      await this.cacheManager.clear();
    } catch (error) {
      console.error(`❌ [RabbitMQ] CẢNH BÁO LỖI KHI TRẢ LẠI KHO:`, error.message);
    }
  }  
  
  // APIs CHO VARIANTS
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Post(':id/variants')
  async addVariant(@Param('id') productId: string, @Body() createVariantDto: CreateVariantDto) {
    const result = await this.productsService.addVariant(productId, createVariantDto);
    await this.cacheManager.clear(); 
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put('variants/:variantId')
  async updateVariant(@Param('variantId') variantId: string, @Body() updateData: CreateVariantDto) {
    const result = await this.productsService.updateVariant(variantId, updateData);
    await this.cacheManager.clear(); 
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('variants/:variantId')
  async removeVariant(@Param('variantId') variantId: string) {
    const result = await this.productsService.removeVariant(variantId);
    await this.cacheManager.clear(); 
    return result;
  }

  @UseGuards(JwtAuthGuard) 
  @Post(':id/reviews')
  async addReview(
    @Request() req,
    @Param('id') productId: string,
    @Body() body: { rating: number; comment: string }
  ) {
    // Trích xuất ID người dùng từ Token
    const userId = req.user?.id || req.user?.sub;
    await this.cacheManager.clear();
    return this.productsService.createReview(
      userId, 
      productId, 
      body.rating, 
      body.comment
    );
  }

}