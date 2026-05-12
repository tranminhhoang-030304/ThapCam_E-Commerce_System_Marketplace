import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { MailerModule } from '@nestjs-modules/mailer';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { MailModule } from './mail/mail.module';
import { UploadModule } from './upload/upload.module';
import { SseModule } from './sse/sse.module';

@Module({
  imports: [
    // 1. Khởi tạo Config Module để đọc file .env
    ConfigModule.forRoot({
      isGlobal: true, 
    }),

    // 2. Khởi tạo TypeORM kết nối tới PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        timezone: '+07:00',
        autoLoadEntities: true,
        // Chỉ bật SSL nếu không phải chạy ở local (localhost hoặc tên service docker)
        ssl: 
          configService.get<string>('DB_HOST') === 'localhost' || 
          configService.get<string>('DB_HOST') === 'postgres-db' 
            ? false 
            : { rejectUnauthorized: false },
        // synchronize: true giúp tự động tạo bảng trong DB dựa trên code Entity.
        // Chỉ dùng ở môi trường DEV, lên Production phải tắt đi.
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, 
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get<string>('REDIS_HOST', 'localhost'), 
            port: configService.get<number>('REDIS_PORT', 6379),
            tls: (configService.get<string>('REDIS_HOST') ? true : false) as any, 
          },
          password: configService.get<string>('REDIS_PASSWORD'),
          ttl: 300000, 
        }),
      }),
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    EventEmitterModule.forRoot(),
    MailModule,
    UploadModule,
    SseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  // Áp dụng LoggerMiddleware cho mọi đường dẫn (Router)
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}