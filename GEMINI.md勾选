# 🚀 ThapCam E-Commerce: Project Instructions (GEMINI.md)

Chào mừng! Đây là tài liệu hướng dẫn và quy chuẩn làm việc dành riêng cho dự án ThapCam E-Commerce. Tài liệu này giúp đảm bảo sự đồng bộ giữa các service (NestJS, Spring Boot) và Frontend (Next.js).

---

## 🏛️ 1. Kiến trúc & Pattern (Architecture)

Dự án tuân thủ nguyên tắc **Clean Code** và **SOLID**. Cụ thể cho từng khối:

### 🔴 NestJS (PIM / Auth)
- **Module-based Architecture**: Chia nhỏ code theo Module (Users, Products, Mail...).
- **Pattern**: Controller -> Service -> TypeORM Repository.
- **Validation**: Luôn sử dụng `DTO` kết hợp với `class-validator` cho dữ liệu đầu vào.
- **Mappers**: Khuyến khích sử dụng mappers để chuyển đổi Entity sang DTO trước khi trả về Client để bảo mật dữ liệu.

### 🟢 Java Spring Boot (OMS / Promotion)
- **Layered Architecture**: 
  - `Controller`: Chỉ xử lý HTTP routing và gọi Service.
  - `Service Interface`: Định nghĩa nghiệp vụ.
  - `Service Implementation`: Triển khai logic chi tiết.
  - `Repository`: Tương tác DB qua JPA.
- **Pattern**: Ưu tiên sử dụng **Interface-based Services** để dễ dàng viết Unit Test (Mocking).
- **Mappers**: Sử dụng **MapStruct** hoặc manual mapper để chuyển đổi Entity <-> DTO.

### 🖥️ Next.js (Frontend)
- **Atomic Design / Component-based**: Chia nhỏ UI thành các component nhỏ, tái sử dụng được.
- **Service Layer**: Tất cả các lệnh gọi API phải nằm trong thư mục `services/` (Sử dụng Axios instance).
- **State Management**: Sử dụng **Zustand** cho global state và **React Query** cho server state.

---

## 📏 2. Quy tắc đặt tên & Code Style (Coding Rules)

### Quy định chung
- **Files/Folders**: 
  - NestJS/Next.js: `kebab-case` (ví dụ: `user-profile.controller.ts`).
  - Java: `PascalCase` cho class, đặt tên theo chức năng (ví dụ: `OrderService.java`).
- **Classes**: `PascalCase`.
- **Variables/Methods**: `camelCase`.
- **Database Tables**: `snake_case` (ví dụ: `order_items`).

### Documentation
- **Hybrid Approach**: 
  - **Self-documenting code**: Tên hàm và biến phải rõ ràng, phản ánh đúng vai trò.
  - **JSDoc (TS) / Javadoc (Java)**: Phải có cho tất cả các Public Methods, Service Methods phức tạp.
  - **Swagger/OpenAPI**: Bắt buộc cập nhật/thêm Annotations (ví dụ: `@ApiProperty` trong NestJS, `@Schema` trong Spring) cho mọi API mới hoặc thay đổi.

---

## 🧪 3. Quy trình làm việc (Workflow)

### Phát triển (GitFlow)
- Nhánh chính: `main` (Production), `develop` (Staging).
- Feature: `feature/ten-tinh-nang`.
- Hotfix: `hotfix/ten-loi`.

### Chất lượng Code (Quality Assurance)
- **Unit Test (Bắt buộc)**: 
  - Mọi code mới/logic mới đều phải có Unit Test đi kèm.
  - **NestJS**: Sử dụng `Jest`.
  - **Spring Boot**: Sử dụng `JUnit 5` và `Mockito`.
- **Swagger**: Phải kiểm tra file Swagger UI/JSON sau khi thay đổi để đảm bảo Frontend có thể tích hợp chính xác.

---

## 🛠️ 4. Tooling & Commands
- **Docker**: `docker-compose up -d` để chạy hạ tầng (Postgres, Redis, RabbitMQ).
- **NestJS**: `npm run start:dev`
- **Spring Boot**: `./mvnw spring-boot:run`
- **Frontend**: `npm run dev`

---

*Lưu ý: Luôn tuân thủ các quy tắc này để đảm bảo tính ổn định và dễ bảo trì của hệ thống.*
