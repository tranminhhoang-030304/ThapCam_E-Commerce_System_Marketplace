import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class SseService {
  // Lưu trữ các đường ống kết nối của từng user
  private clients = new Map<string, Subject<MessageEvent>>();

  // Thêm client vào trạm phát
  addClient(userId: string): Subject<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.clients.set(userId, subject);
    console.log(`📡 [SSE] Client (User: ${userId}) vừa kết nối trạm Radar!`);
    return subject;
  }

  // Xóa client khi họ đóng trình duyệt
  removeClient(userId: string) {
    this.clients.delete(userId);
    console.log(`🔌 [SSE] Client (User: ${userId}) đã ngắt kết nối!`);
  }

  // Bắn thông báo đích danh tới 1 user
  sendToUser(userId: string, data: any) {
    const client = this.clients.get(userId);
    if (client) {
      client.next({ data });
      console.log(`🔔 [SSE] Đã đẩy thông báo tới user ${userId}`);
    } else {
      console.log(`⚠️ [SSE] User ${userId} đang offline, không thể gửi real-time.`);
    }
  }
}