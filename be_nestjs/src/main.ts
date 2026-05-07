import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    //NESTJS SỬ DỤNG WINSTON LÀM LOGGER MẶC ĐỊNH
    logger: WinstonModule.createLogger({
      transports: [
        // 1. Log ra Màn hình Console (Có màu mè dễ nhìn cho lúc code Local)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            nestWinstonModuleUtilities.format.nestLike('ThapCam-NestJS', {
              colors: true,
              prettyPrint: true,
            }),
          ),
        }),
        // 2. Log ra File (Lưu lại để lúc lên Production đọc)
        new winston.transports.DailyRotateFile({
          dirname: 'logs', //Tự tạo thư mục "logs" ở ngoài cùng project
          filename: 'application-%DATE%.log', //Tên file có ngày tháng
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true, // Nén file cũ lại cho nhẹ ổ cứng
          maxSize: '20m', // Nếu file to quá 20MB thì tự cắt sang file mới
          maxFiles: '14d', // Tự động xóa file log cũ hơn 14 ngày
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json() // Lưu dạng JSON chuẩn chỉ
          ),
        }),
      ],
    }),
  });

  const configService = app.get(ConfigService);
  const rabbitmqUrl = configService.get('RABBITMQ_URL') || 'amqp://localhost:5672';
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:3000';

  // 3. TẠO XONG APP RỒI MỚI GẮn RABBITMQ VÀO
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'inventory_update_queue',
      queueOptions: { durable: true },
    },
  });
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'inventory_rollback_queue',
      queueOptions: { durable: true },
    },
  });
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'send_email_notification_queue',
      queueOptions: { durable: true },
    },
  });
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'order_status_update_queue',
      queueOptions: { durable: true },
    },
  });
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'send_invoice_email_queue',
      queueOptions: {
        durable: true,
      },
    },
  });
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl], 
      queue: 'send_vip_reward_queue', 
      queueOptions: { durable: true }, 
    },
  });
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    credentials: true,
  }); 
  app.setGlobalPrefix('api');
  await app.startAllMicroservices();
  await app.listen(4000); 
  console.log(`🚀 NestJS đang chạy trên cổng 4000 & Đã cắm các pipeline RabbitMQ!`);
}
bootstrap();