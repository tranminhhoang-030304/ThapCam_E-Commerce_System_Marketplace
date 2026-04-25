import { Controller, Sse, Param, Req, MessageEvent } from '@nestjs/common';
import { SseService } from './sse.service';
import { Observable } from 'rxjs';
import type { Request } from 'express';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  // API mở cổng kết nối SSE: GET /api/sse/:userId
  @Sse(':userId')
  sse(@Param('userId') userId: string, @Req() req: Request): Observable<MessageEvent> {
    const subject = this.sseService.addClient(userId);

    // Lắng nghe sự kiện khách hàng đóng trình duyệt thì xóa bộ nhớ
    req.on('close', () => {
      this.sseService.removeClient(userId);
    });

    return subject.asObservable();
  }
}