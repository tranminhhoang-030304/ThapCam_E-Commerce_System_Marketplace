import { Global, Module } from '@nestjs/common';
import { SseService } from './sse.service';
import { SseController } from './sse.controller';

@Global() // 
@Module({
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService], // Xuất khẩu Service cho thiên hạ xài
})
export class SseModule {}