package com.example.demo.service;

import com.example.demo.dto.CartItem;
import com.example.demo.dto.CheckoutRequest; 
import com.example.demo.entity.DiscountType;
import com.example.demo.entity.Order;
import com.example.demo.entity.OrderItem;
import com.example.demo.entity.Voucher;
import com.example.demo.repository.OrderItemRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.VoucherRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.Map;

@Service
public class OrderService {

    @Autowired private CartService cartService;
    @Autowired private OrderRepository orderRepository;
    @Autowired private OrderItemRepository orderItemRepository;
    @Autowired private RefundService refundService;
    @Autowired private RabbitTemplate rabbitTemplate;
    @Autowired private CacheService cacheService;
    @Autowired private VoucherRepository voucherRepository;
    @Transactional // Đảm bảo tính toàn vẹn ACID, nếu lỗi ở đâu thì rollback toàn bộ
    public Order checkout(String userIdString, CheckoutRequest request) {
        // 1. Lấy giỏ hàng từ Redis
        List<CartItem> cart = cartService.getCart(userIdString);
        if (cart.isEmpty()) {
            throw new RuntimeException("Giỏ hàng trống, không thể đặt hàng!");
        }

        UUID userId = UUID.fromString(userIdString);

        // 2. Tính tổng tiền
        BigDecimal total = BigDecimal.ZERO;
        for (CartItem item : cart) {
            BigDecimal itemPrice = item.getPrice();
            int qty = item.getQuantity();
            BigDecimal lineTotal = itemPrice.multiply(new BigDecimal(qty));
            // LOGIC MUA NHIỀU GIẢM SÂU
            if (qty >= 10) {
                // Giảm 20%
                BigDecimal discount = lineTotal.multiply(new BigDecimal("0.20"));
                lineTotal = lineTotal.subtract(discount);
                item.setPrice(itemPrice.multiply(new BigDecimal("0.80"))); 
            } else if (qty >= 5) {
                // Giảm 10%
                BigDecimal discount = lineTotal.multiply(new BigDecimal("0.10"));
                lineTotal = lineTotal.subtract(discount);
                item.setPrice(itemPrice.multiply(new BigDecimal("0.90")));
            }

            total = total.add(lineTotal);
        }

        BigDecimal discountAmount = BigDecimal.ZERO;
        String reqVoucherCode = request.getVoucherCode();
        if (reqVoucherCode != null && !reqVoucherCode.trim().isEmpty()) {
            Voucher voucher = voucherRepository.findByCode(reqVoucherCode.trim().toUpperCase())
                    .orElseThrow(() -> new RuntimeException("Mã giảm giá không tồn tại!"));
            // Dàn trận kiểm tra 5 lớp bảo mật
            if (!voucher.getIsActive()) {
                throw new RuntimeException("Mã giảm giá này đã bị khóa!");
            }
            if (voucher.getStartDate() != null && LocalDateTime.now().isBefore(voucher.getStartDate())) {
                throw new RuntimeException("Mã giảm giá chưa đến thời gian sử dụng!");
            }
            if (voucher.getEndDate() != null && LocalDateTime.now().isAfter(voucher.getEndDate())) {
                throw new RuntimeException("Mã giảm giá đã hết hạn!");
            }
            if (voucher.getUsageLimit() != null && voucher.getUsedCount() >= voucher.getUsageLimit()) {
                throw new RuntimeException("Mã giảm giá đã hết lượt sử dụng!");
            }
            if (voucher.getMinOrderValue() != null && total.compareTo(voucher.getMinOrderValue()) < 0) {
                throw new RuntimeException("Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này!");
            }
            if (voucher.getUserId() != null && !voucher.getUserId().equals(userId)) {
                throw new RuntimeException("Mã giảm giá này không dành cho bạn!");
            }

            // Bắt đầu tính tiền giảm
            if (voucher.getDiscountType() == DiscountType.FIXED_AMOUNT) {
                discountAmount = voucher.getDiscountValue();
            } else if (voucher.getDiscountType() == DiscountType.PERCENTAGE) {
                // (Tổng tiền * Phần trăm) / 100
                discountAmount = total.multiply(voucher.getDiscountValue()).divide(new BigDecimal(100));
                // Cắt ngọn nếu vượt quá mức giảm tối đa
                if (voucher.getMaxDiscountAmount() != null && discountAmount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
                    discountAmount = voucher.getMaxDiscountAmount();
                }
            }
            // Tăng biến đếm và lưu lại
            voucher.setUsedCount(voucher.getUsedCount() + 1);
            voucherRepository.save(voucher);
        }

        // TRỪ TIỀN! (Đảm bảo hóa đơn không bao giờ bị âm tiền)
        total = total.subtract(discountAmount);
        if (total.compareTo(BigDecimal.ZERO) < 0) {
            total = BigDecimal.ZERO;
        }

        // 3. Lưu bảng Orders
        Order order = new Order();
        order.setUserId(userId);
        order.setTotalAmount(total);
        order.setStatus("PENDING");
        order.setShippingAddress(request.getShippingAddress());
        order = orderRepository.save(order);
        cacheService.clearDashboardCache();

        // 4. Lưu bảng Order_Items
        for (CartItem item : cart) {
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProductId(UUID.fromString(item.getProductId()));
            if (item.getVariantId() != null && !item.getVariantId().isEmpty()) {
                orderItem.setVariantId(UUID.fromString(item.getVariantId()));
            }
            orderItem.setProductName(item.getProductName());
            orderItem.setPriceAtBuy(item.getPrice());
            orderItem.setQuantity(item.getQuantity());
            orderItemRepository.save(orderItem);
        }

        // 5. Xóa giỏ hàng trong Redis
        cartService.clearCart(userIdString);
        return order;
    }

    @Transactional
    @RabbitListener(queues = "order_refund_queue")
    public void handleOrderRefundRequest(String message) {
        try {
            System.out.println("🚨 Nhận lệnh Cấp cứu từ NestJS: " + message);

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(message);
            String orderIdStr = root.path("data").path("orderId").asText();
            String failedProductIdStr = root.path("data").path("failedProductId").asText();
            String failedVariantIdStr = root.path("data").path("failedVariantId").asText();

            if (orderIdStr != null && !orderIdStr.isEmpty() && !orderIdStr.equals("null")) {
                UUID orderId = UUID.fromString(orderIdStr);
                Order order = orderRepository.findById(orderId).orElse(null);

                if (order != null && !order.getStatus().contains("REFUND")) {
                    order.setStatus("REFUND_PENDING");
                    orderRepository.save(order);
                    System.out.println("⏳ Đã khóa đơn " + orderId + ", chuẩn bị hoàn tiền...");
                    cacheService.clearDashboardCache();
                    // 1. BẮN LỆNH ROLLBACK
                    if (order.getItems() != null && !order.getItems().isEmpty()) {
                        for (OrderItem item : order.getItems()) {
                            if (item.getProductId().toString().equals(failedProductIdStr)) {
                                boolean isSameVariant = (item.getVariantId() == null && (failedVariantIdStr == null || failedVariantIdStr.equals("null")))
                                    || (item.getVariantId() != null && item.getVariantId().toString().equals(failedVariantIdStr));

                                if (isSameVariant) {
                                    System.out.println("⏭️ Bỏ qua cộng lại kho cho SP bị lỗi (Vì nó chưa hề được trừ): " + item.getProductId());
                                    continue; //bỏ qua món này, không gửi lệnh rollback
                                }
                            }    
                            Map<String, Object> payloadData = new HashMap<>();
                            payloadData.put("orderId", order.getId().toString());
                            payloadData.put("productId", item.getProductId().toString());
                            payloadData.put("variantId", item.getVariantId() != null ? item.getVariantId().toString() : null);
                            payloadData.put("quantity", item.getQuantity());

                            // Bọc vào Envelope
                            Map<String, Object> nestEnvelope = new HashMap<>();
                            nestEnvelope.put("pattern", "inventory_rollback_queue");
                            nestEnvelope.put("data", payloadData);

                            try {
                                ObjectMapper mapData = new ObjectMapper();
                                String jsonMessage = mapData.writeValueAsString(nestEnvelope);
                                rabbitTemplate.convertAndSend("inventory_rollback_queue", jsonMessage);
                                System.out.println("⏪ Bắn lệnh trả lại kho cho SP: " + item.getProductId());
                            } catch (Exception e) {
                                System.err.println("❌ Lỗi gửi lệnh rollback: " + e.getMessage());
                            }
                        }
                    }

                    // Bước 2: KHỞI ĐỘNG AUTO-REFUND
                    boolean isRefunded = refundService.processRefund(order);

                    // Bước 3: Cập nhật kết quả cuối cùng
                    if (isRefunded) {
                        order.setStatus("REFUNDED_SUCCESS");
                        orderRepository.save(order);
                        System.out.println("🏆 KẾT THÚC: Đơn hàng đã được hoàn tiền tự động!");
                        cacheService.clearDashboardCache();
                        // 2. BẮN TÍN HIỆU GỬI EMAIL 
                        try {
                            Map<String, Object> emailPayload = new HashMap<>();
                            emailPayload.put("userId", order.getUserId().toString());
                            emailPayload.put("orderId", order.getId().toString());
                            emailPayload.put("reason", "Hết hàng trong kho (Auto-Refunded)");// Bọc vào Envelope
                            Map<String, Object> emailEnvelope = new HashMap<>();
                            emailEnvelope.put("pattern", "send_email_notification_queue");
                            emailEnvelope.put("data", emailPayload);
                            ObjectMapper mapData = new ObjectMapper();
                            String jsonMessage = mapData.writeValueAsString(emailEnvelope);
                            rabbitTemplate.convertAndSend("send_email_notification_queue", jsonMessage);
                            System.out.println("📧 Đã ủy quyền cho NestJS gửi email xin lỗi khách hàng!");
                        } catch (Exception e) {
                            System.err.println("❌ Lỗi gửi tín hiệu email: " + e.getMessage());
                        }

                    } else {
                        System.err.println("⚠️ KẾT THÚC: Hoàn tiền tự động thất bại, chờ Admin xử lý.");
                    }
                }
            } else {
                System.out.println("❌ Cảnh báo: Không bóc được orderId ra khỏi JSON!");
            }
        } catch (Exception e) {
            System.err.println("Lỗi xử lý tin nhắn hủy đơn: " + e.getMessage());
        }  
    }    
}