package com.example.demo.service;

import com.example.demo.dto.AdminOrderDetailResponse;
import com.example.demo.dto.AdminOrderListResponse;
import com.example.demo.entity.Order;
import com.example.demo.entity.Payment;
import com.example.demo.repository.OrderItemRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import com.example.demo.entity.OrderItem;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.math.BigDecimal;
import org.springframework.cache.annotation.Cacheable;
import com.example.demo.entity.Voucher;
import com.example.demo.entity.DiscountType;
import com.example.demo.repository.VoucherRepository;

@Service
public class AdminOrderService {

    @Autowired private OrderRepository orderRepository;
    @Autowired private OrderItemRepository orderItemRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private RabbitTemplate rabbitTemplate;
    @Autowired private VoucherRepository voucherRepository;

    // 1. LẤY DANH SÁCH ĐƠN HÀNG (CÓ PHÂN TRANG + LỌC STATUS + TRẢ VỀ DTO)
    public Page<AdminOrderListResponse> getAllOrders(int page, int size, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<Order> orderPage;

        // Nếu có truyền status xuống thì lọc, không thì lấy tất cả
        if (status != null && !status.trim().isEmpty()) {
            orderPage = orderRepository.findByStatus(status, pageable);
        } else {
            orderPage = orderRepository.findAll(pageable);
        }

        // Dùng tính năng .map() của Page để chuyển Entity -> DTO
        return orderPage.map(order -> new AdminOrderListResponse(order));
    }

    // 2. XEM CHI TIẾT ĐƠN HÀNG (GOM DỮ LIỆU)
    public AdminOrderDetailResponse getOrderDetail(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + orderId));

        // Lấy payment từ List
        List<Payment> payments = paymentRepository.findByOrderId(orderId);
        Payment payment = (payments != null && !payments.isEmpty()) ? payments.get(0) : null;

        return new AdminOrderDetailResponse(
                order,
                orderItemRepository.findByOrderId(orderId),
                payment
        );
    }

    // 3. CẬP NHẬT TRẠNG THÁI
    public Order updateOrderStatus(UUID orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng!"));

        String currentStatus = order.getStatus();
        newStatus = newStatus.toUpperCase();

        List<String> validStatuses = Arrays.asList("PENDING", "PAID", "DELIVERY", "SHIPPING", "COMPLETED", "CANCELLED", "RECEIVE", "REFUND_PENDING", "REFUNDED_SUCCESS");
        if (!validStatuses.contains(newStatus)) {
            throw new RuntimeException("Trạng thái không hợp lệ!");
        }

        if (currentStatus.equals("CANCELLED")) {
            throw new RuntimeException("Đơn hàng đã hủy, không thể thay đổi trạng thái!");
        }
        if (currentStatus.equals("COMPLETED")) {
            throw new RuntimeException("Đơn hàng đã hoàn thành, không thể thay đổi!");
        }

        //LOGIC COD: ADMIN XÁC NHẬN ĐÃ THU TIỀN MẶT
        if (newStatus.equals("PAID") && currentStatus.equals("PENDING")) {
            
            // 1. Kiểm tra chống trùng thanh toán
            List<Payment> existingPayments = paymentRepository.findByOrderId(orderId);
            boolean alreadyPaidOnline = existingPayments != null && existingPayments.stream()
                    .anyMatch(p -> "SUCCESS".equals(p.getStatus()));

            if (alreadyPaidOnline) {
                throw new RuntimeException("Đơn hàng này đã được thanh toán online! Không thể ghi nhận thu tiền mặt (COD) nữa.");
            }

            // 2. Tạo biên lai thu tiền mặt (COD)
            Payment codPayment = new Payment();
            codPayment.setOrderId(order.getId());
            codPayment.setTransactionId("COD-" + System.currentTimeMillis()); 
            codPayment.setAmount(order.getTotalAmount());
            codPayment.setPaymentMethod("COD"); 
            codPayment.setStatus("SUCCESS");
            paymentRepository.save(codPayment);
            
            System.out.println("💰 Admin đã xác nhận thu tiền mặt (COD) cho đơn hàng: " + orderId);

            // 3. Bắn RabbitMQ sang NestJS để trừ tồn kho
            if (order.getItems() != null && !order.getItems().isEmpty()) {
                for (OrderItem item : order.getItems()) {
                    Map<String, Object> data = new HashMap<>();
                    data.put("orderId", order.getId().toString());
                    data.put("productId", item.getProductId().toString());
                    data.put("variantId", item.getVariantId() != null ? item.getVariantId().toString() : null);
                    data.put("quantity", item.getQuantity());

                    Map<String, Object> nestEnvelope = new HashMap<>();
                    nestEnvelope.put("pattern", "inventory_update_queue");
                    nestEnvelope.put("data", data);

                    try {
                        ObjectMapper mapper = new ObjectMapper();
                        String jsonMessage = mapper.writeValueAsString(nestEnvelope);
                        rabbitTemplate.convertAndSend("inventory_update_queue", jsonMessage);
                        System.out.println("📦 Đã bắn tin trừ kho cho đơn COD: " + jsonMessage);
                    } catch (Exception e) {
                        System.err.println("❌ Lỗi đóng gói JSON RabbitMQ: " + e.getMessage());
                    }
                }
            }
        }
        order.setStatus(newStatus);
        Order saveOrder = orderRepository.save(order);
        System.out.println("🕵️‍♂️ KIỂM TRA: Đơn hàng " + orderId + " vừa chuyển sang " + newStatus + " (COMPLETED), tổng tiền: " + order.getTotalAmount());

        // LOGIC TẶNG VOUCHER VIP CHO KHÁCH SỘP KHI HOÀN THÀNH ĐƠN
        if ("COMPLETED".equals(newStatus)) {
            BigDecimal totalAmount = order.getTotalAmount();
            BigDecimal discountValue = null;
            String vipTier = "";

            // Phân loại khách sộp
            if (totalAmount.compareTo(new BigDecimal("10000000")) >= 0) { // >= 10 củ
                discountValue = new BigDecimal("10"); // Tặng 10%
                vipTier = "VIP10";
            } else if (totalAmount.compareTo(new BigDecimal("5000000")) >= 0) { // >= 5 củ
                discountValue = new BigDecimal("5"); // Tặng 5%
                vipTier = "VIP5";
            }

            // Nếu đủ điều kiện thì sinh mã và bắn RabbitMQ
            if (discountValue != null) {
                // 1. Tạo Voucher Private độc quyền
                String uniqueCode = vipTier + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                Voucher vipVoucher = new Voucher();
                vipVoucher.setCode(uniqueCode);
                vipVoucher.setDiscountType(DiscountType.PERCENTAGE);
                vipVoucher.setDiscountValue(discountValue);
                vipVoucher.setMaxDiscountAmount(new BigDecimal("500000")); // Tối đa giảm 500k cho lần sau
                vipVoucher.setUsageLimit(1); // Xài 1 lần
                vipVoucher.setUserId(order.getUserId()); // Khóa cứng vào User này
                vipVoucher.setEndDate(LocalDateTime.now().plusDays(30)); // Hạn xài 30 ngày
                vipVoucher.setIsActive(true);

                voucherRepository.save(vipVoucher);
                System.out.println("🎉 Đã tạo mã VIP " + uniqueCode + " cho User: " + order.getUserId());

                // 2. Bắn sang RabbitMQ kênh mới để NestJS gửi Mail 
                try {
                    Map<String, Object> vipPayload = new HashMap<>();
                    vipPayload.put("userId", order.getUserId().toString());
                    vipPayload.put("voucherCode", uniqueCode);
                    vipPayload.put("discountValue", discountValue + "%");
                    vipPayload.put("totalAmount", totalAmount.toString());

                    Map<String, Object> nestEnvelope = new HashMap<>();
                    nestEnvelope.put("pattern", "send_vip_reward_queue"); // Kênh dành riêng cho VIP
                    nestEnvelope.put("data", vipPayload);

                    ObjectMapper mapper = new ObjectMapper();
                    String jsonMessage = mapper.writeValueAsString(nestEnvelope);
                    rabbitTemplate.convertAndSend("send_vip_reward_queue", jsonMessage);
                    System.out.println("🚀 [RABBITMQ] Đã bắn lệnh gửi mail tri ân VIP tới NestJS!");
                } catch (Exception e) {
                    System.err.println("❌ Lỗi gửi RabbitMQ VIP Voucher: " + e.getMessage());
                }
            }
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("userId", order.getUserId().toString());
            payload.put("orderId", order.getId().toString());
            payload.put("status", newStatus);
            
            // Tùy biến câu chữ cho mượt
            String message = "Đơn hàng của bạn đã chuyển sang trạng thái: " + newStatus;
            if ("SHIPPING".equals(newStatus) || "DELIVERY".equals(newStatus)) message = "Đơn hàng của bạn đã được giao cho đơn vị vận chuyển. Chú ý điện thoại nhé!";
            if ("COMPLETED".equals(newStatus)) message = "Đơn hàng đã giao thành công. Hãy đánh giá 5 sao cho sản phẩm nhé!";
            
            payload.put("message", message);

            Map<String, Object> envelope = new HashMap<>();
            envelope.put("pattern", "order_status_update_queue");
            envelope.put("data", payload);

            ObjectMapper mapper = new ObjectMapper();
            String jsonMessage = mapper.writeValueAsString(envelope);
            
            rabbitTemplate.convertAndSend("order_status_update_queue", jsonMessage);
            System.out.println("📢 Đã bắn tín hiệu cập nhật trạng thái đơn hàng sang cho NestJS!");
        } catch (Exception e) {
            System.err.println("❌ Lỗi gửi tín hiệu thông báo: " + e.getMessage());
        }
        return saveOrder;
    }

    @Cacheable(value = "dashboard_stats", key = "'overview'")
    public Map<String, Object> getDashboardOverview() {
        Map<String, Object> response = new HashMap<>();

        // 1. Thống kê tổng quan (Giả lập số cơ bản, sếp có thể mở rộng thêm)
        long totalOrders = orderRepository.count();
        // Tính tổng doanh thu các đơn đã PAID hoặc COMPLETED
        BigDecimal totalRevenue = orderRepository.calculateTotalRevenue();
        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO; // Tránh lỗi NullPointerException nếu chưa có đơn nào
        }

        response.put("totalRevenue", totalRevenue);
        response.put("totalOrders", totalOrders);
        int totalCustomers = 0;
        int activeProducts = 0;

        try {
            RestTemplate restTemplate = new RestTemplate();
            ObjectMapper mapper = new ObjectMapper();

            // 1. Hỏi NestJS xem có bao nhiêu Khách hàng
            try {
                String usersJson = restTemplate.getForObject("http://localhost:4000/api/users", String.class);
                if (usersJson != null) {
                    JsonNode usersNode = mapper.readTree(usersJson);
                    if (usersNode.isArray()) {
                        totalCustomers = usersNode.size(); // Nếu là mảng [...]
                    } else if (usersNode.has("total")) {
                        totalCustomers = usersNode.get("total").asInt(); // Nếu là object { total: x }
                    }
                }
            } catch (Exception e) {
                System.out.println("❌ Lỗi lấy Users: " + e.getMessage());
            }

            // 2. Hỏi NestJS xem có bao nhiêu Sản phẩm
            try {
                String productsJson = restTemplate.getForObject("http://localhost:4000/api/products", String.class);
                if (productsJson != null) {
                    JsonNode prodsNode = mapper.readTree(productsJson);
                    if (prodsNode.isArray()) {
                        activeProducts = prodsNode.size(); // Bắt trọn số 8 nếu là mảng!
                    } else if (prodsNode.has("total")) {
                        activeProducts = prodsNode.get("total").asInt();
                    } else if (prodsNode.has("items")) {
                        activeProducts = prodsNode.get("items").size();
                    } else if (prodsNode.has("data")) {
                        activeProducts = prodsNode.get("data").size();
                    }
                }
            } catch (Exception e) {
                System.out.println("❌ Lỗi lấy Products: " + e.getMessage());
            }

        } catch (Exception e) {
            System.out.println("❌ Lỗi hệ thống khi gọi Microservices: " + e.getMessage());
        }

        // Cập nhật lại số chuẩn vào báo cáo
        response.put("totalCustomers", totalCustomers);
        response.put("activeProducts", activeProducts);

        // 2. Tính doanh thu 7 ngày gần nhất để vẽ biểu đồ
        List<Map<String, Object>> revenueData = new ArrayList<>();
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");

        // Quét lùi 7 ngày
        for (int i = 6; i >= 0; i--) {
            LocalDate targetDate = today.minusDays(i);
            LocalDateTime startOfDay = targetDate.atStartOfDay();
            LocalDateTime endOfDay = targetDate.plusDays(1).atStartOfDay();

            // Lấy các đơn hàng trong ngày đó (Đã thanh toán)
           BigDecimal dayRevenue = orderRepository.calculateRevenueBetweenDates(startOfDay, endOfDay);
        if (dayRevenue == null) {
            dayRevenue = BigDecimal.ZERO;
        }

            Map<String, Object> dayData = new HashMap<>();
            // Đặt tên trục X (Ví dụ: T2, T3... hoặc ngày 14/04)
            dayData.put("name", targetDate.format(formatter)); 
            dayData.put("total", dayRevenue);
            revenueData.add(dayData);
        }

        response.put("revenueChart", revenueData);
        return response;
    }

    // LẤY LỊCH SỬ MUA HÀNG VÀ TỔNG TIỀN CỦA 1 KHÁCH HÀNG
    public Map<String, Object> getCustomerOrderStats(UUID userId) {
        List<Order> userOrders = orderRepository.findByUserId(userId);

        // Chỉ cộng tiền những đơn đã thanh toán hoặc hoàn thành
        BigDecimal totalSpent = userOrders.stream()
                .filter(o -> "PAID".equals(o.getStatus()) || "COMPLETED".equals(o.getStatus()))
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new HashMap<>();
        result.put("totalSpent", totalSpent != null ? totalSpent : BigDecimal.ZERO);
        result.put("totalOrders", userOrders.size());
        result.put("orders", userOrders); // Trả về danh sách đơn để Frontend vẽ list
        return result;
    }
}