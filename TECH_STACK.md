# 📚 Danh sách Công nghệ & Thư viện (Tech Stack & Dependencies)

Dự án **ThapCam E-Commerce** là một hệ thống Monorepo, được chia thành 3 khối chính. Dưới đây là danh sách toàn bộ các công nghệ, framework và thư viện lõi cùng phiên bản (version) được sử dụng trong hệ thống.

---

## 🐳 1. Hạ tầng Cơ sở (Infrastructure & DevOps)
> **Quản lý triển khai:** Docker & Docker Compose (`docker-compose.yml`)

* **Database Core:** PostgreSQL (`v15-alpine`)
* **In-memory Cache / Session:** Redis (`v7-alpine`)
* **Message Broker:** RabbitMQ (`v3-management-alpine`) - Tích hợp sẵn UI quản lý.

---

## 🖥️ 2. Khối Frontend (Next.js)
> **Môi trường:** Node.js (v18+)
> **Quản lý package:** npm / yarn (`fe/package.json`)

**Framework Lõi:**
* `next` (v16.2.0) - Framework App Router.
* `react` & `react-dom` (v19.2.4) - Thư viện giao diện UI.

**Quản lý Trạng thái & Data Fetching:**
* `zustand` (^4.5.7) - Quản lý Global State (Giỏ hàng, Auth UI).
* `@tanstack/react-query` (^5.28.0) - Cache & Fetch dữ liệu API.
* `axios` (^1.13.6) - HTTP Client kết nối tới API.

**UI, Styling & Animation:**
* `tailwindcss` (^4.2.0) - Utility-first CSS framework.
* `lucide-react` (^0.564.0) - Thư viện Icon hiển thị.
* `sonner` (^1.7.1) - Hiển thị thông báo (Toast notifications) mượt mà.

**Tiện ích khác:**
* `react-hook-form` (^7.54.1) & `zod` (^3.24.1) - Validate form đầu vào.
* `recharts` (^2.15.0) - Vẽ biểu đồ doanh thu Admin.

---

## 🔴 3. Khối Backend 1 (NestJS - PIM & Auth)
> **Môi trường:** Node.js (v18+) 
> **Quản lý package:** npm / yarn (`be_nestjs/package.json`)

**Framework Lõi:**
* `@nestjs/core`, `@nestjs/common` (^11.0.1) - Framework kiến trúc Backend.
* `typescript` (5.7.3) - Ngôn ngữ phát triển.

**Cơ sở dữ liệu (Database):**
* `@nestjs/typeorm` (^11.0.0) & `typeorm` (^0.3.28) - ORM thao tác với PostgreSQL.
* `pg` (^8.20.0) - Driver kết nối PostgreSQL.

**Bảo mật & Xác thực (Auth):**
* `@nestjs/jwt` (^11.0.2) & `passport-jwt` (^4.0.1) - Ký & Xác thực Token.
* `@nestjs/passport` (^11.0.5) & `passport-google-oauth20` (^2.0.0) - Đăng nhập Google.
* `bcrypt` (^6.0.0) - Mã hóa mật khẩu người dùng.

**Giao tiếp Bất đồng bộ (RabbitMQ):**
* `@nestjs/microservices` (^11.1.18) - Module giao tiếp microservices.
* `amqplib` (^1.0.3) & `amqp-connection-manager` (^5.0.0) - Driver kết nối RabbitMQ.

**Tiện ích Bên thứ 3 (Third-party):**
* `nodemailer` (^8.0.5) & `@nestjs-modules/mailer` (^1.11.2) - Gửi email thông báo, tặng Voucher.
* `cloudinary` (^2.9.0) - Lưu trữ và quản lý ảnh sản phẩm trên Cloud.

---

## 🟢 4. Khối Backend 2 (Java Spring Boot - OMS & Promotion)
> **Môi trường:** Java 17 
> **Quản lý package:** Maven (`be_javaspring/demo/pom.xml`)

**Framework Lõi:**
* `spring-boot-starter-webmvc` (v4.0.4) - Framework khởi tạo API RESTful.
* `lombok` - Rút gọn code (tự động tạo Getter, Setter, Constructor).

**Cơ sở dữ liệu & Caching:**
* `spring-boot-starter-data-jpa` - Tương tác dữ liệu bằng Hibernate/JPA.
* `postgresql` - Driver JDBC cho CSDL PostgreSQL.
* `spring-boot-starter-data-redis` - Kết nối Redis để lưu trữ Giỏ hàng (Cart).

**Giao tiếp Bất đồng bộ (RabbitMQ):**
* `spring-boot-starter-amqp` - Lắng nghe & Gửi sự kiện hệ thống (Khuyến mãi, Hoàn tiền).

**Bảo mật & Thanh toán:**
* `spring-boot-starter-security` - Bảo mật API, phân quyền.
* `jjwt-api`, `jjwt-impl`, `jjwt-jackson` (v0.12.5) - Thư viện xử lý chuỗi JSON Web Token.
* `stripe-java` (v24.2.0) - Tích hợp cổng thanh toán Quốc tế Stripe.