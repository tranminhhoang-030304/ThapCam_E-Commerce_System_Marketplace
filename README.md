<div align="center">
  <h1>🛒 ThapCam E-Commerce</h1>
  <p><strong>Nền tảng Thương mại Điện tử "Thập cẩm, mong muốn nhận nhiều góp ý, đánh giá, phản hồi"</strong></p>

  ![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
  ![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
  ![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
</div>

---

## 🌟 1. Giới thiệu tổng quan (Introduction)

Chào mừng bạn đến với **ThapCam E-Commerce**! 👋 

ThapCam chỉ là một ứng dụng bán hàng thông thường. Đây là một hệ thống được thiết kế theo chuẩn **Microservices** tiên tiến, kết hợp sức mạnh của hệ sinh thái Node.js (NestJS) và Java (Spring Boot) trong một kiến trúc **Monorepo** duy nhất. 

Dự án ra đời nhằm giải quyết các bài toán hóc búa trong thương mại điện tử như: xử lý giỏ hàng, quản lý hàng tồn kho chính xác, giao tiếp bất đồng bộ giữa các dịch vụ và đặc biệt là một hệ thống **Promotion Engine (Khuyến mãi)** khá linh hoạt và tự động hóa 

---

## ✨ 2. Các tính năng nổi bật (Key Features)

* 🚀 **Promotion Engine Nâng cao:** * **Volume Discount:** Tự động giảm giá trực tiếp (Real-time) khi mua sỉ/combo.
    * **Voucher Tự động:** Sinh mã Tân thủ (Welcome) và mã Khách VIP (Private) độc quyền, bám sát hành vi người dùng.
    * **Gợi ý Thông minh:** Tự động đề xuất các mã giảm giá khả dụng ngay tại trang thanh toán.
* 🛡️ **Quản lý Đơn hàng & Tồn kho Resilient:** * Đồng bộ tồn kho qua Message Broker (RabbitMQ).
    * **Auto-Refund:** Tự động hoàn tiền và gửi email xin lỗi nếu xảy ra xung đột/lỗi kho trong quá trình xử lý đơn hàng.
* 🔔 **Thông báo Thời gian thực (Real-time Notifications):** * Ứng dụng công nghệ **Server-Sent Events (SSE)** để đẩy tức thì các thông báo thay đổi trạng thái đơn hàng đến thiết bị của khách hàng mà không cần reload trang.
* 💳 **Thanh toán Đa kênh:** Tích hợp liền mạch với VNPAY, MoMo, Stripe và hỗ trợ thanh toán khi nhận hàng (COD).
* 🔐 **Xác thực & Phân quyền (RBAC):** Đăng nhập bằng Google OAuth2, bảo mật bằng JWT, phân quyền Admin/Customer rõ ràng.
* ⚡ **Hiệu suất & UX/UI:** Giao diện Next.js mượt mà, quản lý state bằng Zustand, caching dữ liệu với React Query và Redis.

---

## 🏛️ 3. Kiến trúc hệ thống tổng thể (Overall Architecture)

Hệ thống được chia làm hai khối Backend chính, giao tiếp với nhau thông qua **RabbitMQ** để đảm bảo tính decoupling (lỏng lẻo) và chịu lỗi (fault tolerance).

### Biểu đồ Kiến trúc Tổng thể

```mermaid
graph TD
    Client[🖥️ Next.js Frontend]

    subgraph "Khối Node.js (PIM / Auth / Mail)"
        NestJS[🔴 NestJS API<br/>(Render)]
        DB1[(Supabase DB<br/>nestjs_db)]
        NestJS --- DB1
    end

    subgraph "Khối Java (OMS / Cart / Promotion)"
        Spring[🟢 Spring Boot API<br/>(Render)]
        DB2[(Supabase DB<br/>java_db)]
        Redis[(Upstash Redis)]
        Spring --- DB2
        Spring --- Redis
    end

    subgraph "Hạ tầng Event-Driven"
        RabbitMQ((🐰 CloudAMQP))
    end

    Client <-->|REST API / SSE| NestJS
    Client <-->|REST API| Spring
    
    NestJS -.->|Publish / Subscribe| RabbitMQ
    Spring -.->|Publish / Subscribe| RabbitMQ

    classDef nest fill:#e0234e,stroke:#fff,stroke-width:2px,color:#fff;
    classDef spring fill:#6db33f,stroke:#fff,stroke-width:2px,color:#fff;
    classDef mq fill:#ff6600,stroke:#fff,stroke-width:2px,color:#fff;
    
    class NestJS nest;
    class Spring spring;
    class RabbitMQ mq;


### Luồng Giao tiếp Bất đồng bộ: Kịch bản Đăng ký & Tặng Voucher Tân thủ
### Thay vì gọi API đồng bộ dễ gây nghẽn, ThapCam xử lý nghiệp vụ phức tạp bằng Event-Driven:

sequenceDiagram
    autonumber
    actor User as 👤 Khách hàng
    participant FE as 🖥️ Frontend
    participant Nest as 🔴 NestJS (Auth)
    participant MQ as 🐰 RabbitMQ
    participant Java as 🟢 Spring Boot (Voucher)
    participant Mail as 🔴 NestJS (Mail)

    User->>FE: Đăng ký tài khoản
    FE->>Nest: POST /api/auth/register
    Nest->>Nest: Lưu User vào DB
    Nest->>MQ: Publish Event: user_registered_queue
    Nest-->>FE: Trả về HTTP 200 (Thành công)
    
    MQ-->>Java: Consume Event (Thông tin User)
    Java->>Java: Tạo mã NEWBIE độc quyền & Lưu DB
    Java->>MQ: Publish Event: send_email_notification_queue
    
    MQ-->>Mail: Consume Event (Voucher Code)
    Mail->>User: Gửi Email chào mừng kèm mã giảm giá!

## ☁️ 4. Triển khai Cloud (Deployment Providers)

Dự án hỗ trợ chạy song song cả môi trường **Local (Docker)** và **Cloud (Production)**. Các dịch vụ Cloud đang sử dụng:
- **Frontend:** [Vercel](https://vercel.com/)
- **Backend Services:** [Render](https://render.com/)
- **Databases:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Message Broker:** [CloudAMQP](https://www.cloudamqp.com/) (RabbitMQ)
- **Caching:** [Upstash](https://upstash.com/) (Redis)

---

## ⚙️ 5. Hướng dẫn cài đặt (Installation)
Yêu cầu hệ thống (Prerequisites)
- Node.js (v18+) & npm/yarn
- Java 17 & Maven
- Docker & Docker Compose

### Bước 1: Clone dự án
```bash
git clone [https://github.com/yourusername/thapcam_e-commerce.git](https://github.com/yourusername/thapcam_e-commerce.git)
cd thapcam_e-commerce
```

### Bước 2: Khởi động Hạ tầng Core (Database, Redis, Message Broker)
Đảm bảo bạn đã cấu hình file .env ngoài cùng thư mục gốc (xem phần 6), sau đó chạy lệnh:

```bash
docker-compose up -d
``` 
Kiểm tra các container đang chạy bằng lệnh docker ps

🚀 5. Hướng dẫn chạy dự án (Running the project)
Mở 3 cửa sổ Terminal độc lập để khởi chạy 3 khối của dự án:

### Terminal 1: Khởi chạy khối NestJS (PIM / Auth)
```bash
cd be_nestjs
npm install
npm run start:dev
```
# Server sẽ chạy tại: http://localhost:4000

### Terminal 2: Khởi chạy khối Java Spring Boot (OMS / Promotion)

```bash
cd be_javaspring/demo
mvn clean install
mvn spring-boot:run
```
# Server sẽ chạy tại: http://localhost:8080

### Terminal 3: Khởi chạy Frontend Next.js
```bash
cd fe
npm install
npm run dev
```
# Ứng dụng web sẽ chạy tại: http://localhost:3000

🔒 6. Cấu hình biến môi trường (Env configuration)
Dự án sử dụng cơ chế bảo mật biến môi trường cực kỳ nghiêm ngặt. Hệ thống đã được thiết lập sẵn .gitignore để tránh rò rỉ khóa bí mật. Bạn cần sao chép các file .example thành file thực tế và điền thông tin tương ứng.

### Hạ tầng Docker (.env tại thư mục gốc)
1. Tạo file .env từ file .env.example
DOCKER_POSTGRES_USER=admin
DOCKER_POSTGRES_PASSWORD=adminpassword
DOCKER_POSTGRES_DB=defaultdb
DOCKER_POSTGRES_PORT=5434
DOCKER_REDIS_PORT=6379
DOCKER_RABBITMQ_USER=guest
DOCKER_RABBITMQ_PASSWORD=guest

2. Khối NestJS (be_nestjs/.env)
DB_PORT=5434
DB_USERNAME=admin
JWT_SECRET=day-la-chia-khoa-bi-mat-cua-du-an
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
GOOGLE_CLIENT_ID=...
CLOUDINARY_URL=...

3. Khối Java Spring (be_javaspring/demo/src/main/resources/application.yml)
spring:
  datasource:
    url: jdbc:postgresql://localhost:5434/java_db_order
jwt:
  secret: day-la-chia-khoa-bi-mat-cua-du-an # Đồng bộ với NestJS
payment:
  vnpay:
    tmnCode: "..."
  stripe:
    secret-key: "..."

4. Khối Frontend (fe/.env.local)
NEXT_PUBLIC_API_PIM_URL=http://localhost:4000/api
NEXT_PUBLIC_API_OMS_URL=http://localhost:8080/api

📁 7. Cấu trúc thư mục (Folder structure)
Dự án sử dụng mô hình Monorepo để dễ dàng quản lý mã nguồn của toàn bộ hệ sinh thái:

thapcam_e-commerce/
├── be_javaspring/          # 🟢 Backend OMS (Java Spring Boot)
│   └── demo/src/main/java  # Chứa Controller, Service, Repository cho Order, Cart, Voucher
├── be_nestjs/              # 🔴 Backend PIM & Auth (Node.js/NestJS)
│   └── src/                # Chứa Module Users, Auth, Mail, Products, SSE Notifications
├── fe/                     # 🖥️ Frontend (Next.js 14)
│   ├── app/                # App Router (Pages, Checkout, Admin Dashboard)
│   ├── components/         # UI Components (Shadcn UI, Tailwind)
│   ├── services/           # Lớp gọi API (AxiosClient)
│   └── stores/             # Quản lý State (Zustand)
├── docker-compose.yml      # Bản vẽ hạ tầng (Postgres, Redis, RabbitMQ)
├── .env                    # Chứa biến môi trường cho Docker
└── .gitignore              # Bộ lọc chặn các file nhạy cảm toàn dự án

🤝 8. Hướng dẫn đóng góp (Contribution guidelines)
Chúng tôi luôn hoan nghênh các đóng góp để ThapCam trở nên hoàn thiện hơn! Để đóng góp mã nguồn:
1. Fork repository này.
2. Tạo một nhánh mới (Branch): git checkout -b feature/AmazingFeature
3. Commit các thay đổi: git commit -m 'Thêm một vài tính năng tuyệt vời'
4. Push lên nhánh vừa tạo: git push origin feature/AmazingFeature
5. Mở một Pull Request để chúng tôi xem xét.
Vui lòng tuân thủ các quy tắc coding convention hiện có của dự án (ESLint cho TypeScript và Checkstyle cho Java).

📄 9. Giấy phép (License)
Dự án này được phân phối dưới giấy phép MIT License. Bạn có quyền tự do sử dụng, sao chép, sửa đổi, hợp nhất, xuất bản, phân phối và bán các bản sao của phần mềm. Vui lòng xem file LICENSE để biết thêm chi tiết.

🗺️ 10. Lộ trình phát triển (Roadmap)
Dự án vẫn đang được phát triển tích cực. Dưới đây là các hạng mục dự kiến trong các Phase tiếp theo:
- [ ] Data Analytics (Python): Tích hợp Microservice Tracking Events Game Analytics bằng Python (FastAPI/Flask) & PostgreSQL để phân tích dữ liệu và dự đoán Churn rate (rời bỏ) của khách hàng.
- [ ] Logistics Module: Bổ sung Kịch bản Freeship và kết nối API của các đơn vị vận chuyển (GHTK, GHN).
- [ ] CI/CD Pipeline: Tự động hóa quá trình test và deploy lên nền tảng Cloud (AWS/GCP) bằng GitHub Actions.