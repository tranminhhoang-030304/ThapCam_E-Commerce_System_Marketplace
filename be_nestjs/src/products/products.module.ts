import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { AuthModule } from '../auth/auth.module'; 
import { ProductVariant } from './entities/product-variant.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Review } from './entities/review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, ProductVariant, Review]),
    AuthModule,
    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'order_refund_queue', 
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  providers: [ProductsService],
  controllers: [ProductsController]
})
export class ProductsModule {}