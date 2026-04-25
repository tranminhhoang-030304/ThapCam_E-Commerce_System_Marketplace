package com.example.demo.service;

import com.example.demo.entity.DiscountType;
import com.example.demo.entity.Voucher;
import com.example.demo.repository.VoucherRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class VoucherSchedulerService {

    private final StringRedisTemplate redisTemplate;
    private final VoucherRepository voucherRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // "0 0 0 * * ?" = Chạy vào đúng 00:00:00 (Nửa đêm) mỗi ngày
    // có thể đổi thành "0 * * * * ?" để chạy 1 phút/lần 
    @Scheduled(cron = "0 0 0 * * ?") 
    public void rescueAbandonedCarts() {
        System.out.println("[CRON JOB] Bắt đầu đi tuần tra giỏ hàng bị bỏ quên...");
        
        // Quét toàn bộ chìa khóa giỏ hàng trong Redis (Định dạng: cart:{userId})
        Set<String> cartKeys = redisTemplate.keys("cart:*");
        if (cartKeys == null || cartKeys.isEmpty()) return;

        for (String key : cartKeys) {
            String userIdStr = key.split(":")[1];
            String notifiedKey = "cart_notified:" + userIdStr; // Chìa khóa đánh dấu đã nhắc nhở

            // Tránh spam: Nếu đã tặng mã cho ông này trong vòng 7 ngày qua rồi thì thôi
            if (Boolean.TRUE.equals(redisTemplate.hasKey(notifiedKey))) {
                continue;
            }

            // Kiểm tra xem giỏ hàng có đồ thật không hay rỗng ("[]")
            String cartData = redisTemplate.opsForValue().get(key);
            if (cartData != null && !cartData.equals("[]") && cartData.length() > 5) {
                UUID userId = UUID.fromString(userIdStr);

                // 1. CHẾ TẠO VOUCHER PRIVATE CHO KHÁCH CỤ THỂ
                Voucher voucher = new Voucher();
                voucher.setCode("COMEBACK-" + userIdStr.substring(0, 6).toUpperCase()); // Mã độc quyền
                voucher.setDiscountType(DiscountType.PERCENTAGE);
                voucher.setDiscountValue(new BigDecimal("10")); // Tặng 10%
                voucher.setMaxDiscountAmount(new BigDecimal("100000")); // Tối đa 100k
                voucher.setUsageLimit(1); // Chỉ xài 1 lần
                voucher.setUserId(userId); // Chỉ đúng UUID này mới xài được
                voucher.setEndDate(LocalDateTime.now().plusDays(3)); // Mua trong 3 ngày hoặc mất
                voucher.setIsActive(true);
                
                // Lưu vào Database (Check tránh lưu trùng mã nếu lỡ chạy lại)
                if (voucherRepository.findByCode(voucher.getCode()).isEmpty()) {
                    voucherRepository.save(voucher);
                }

                // 2. GÓI MESSAGE BẮN QUA RABBITMQ CHO NESTJS GỬI EMAIL
                try {
                    Map<String, Object> payloadData = new HashMap<>();
                    payloadData.put("userId", userIdStr);
                    payloadData.put("voucherCode", voucher.getCode());
                    payloadData.put("discountValue", "10%");
                    payloadData.put("reason", "ABANDONED_CART");

                    Map<String, Object> nestEnvelope = new HashMap<>();
                    nestEnvelope.put("pattern", "send_abandoned_cart_email_queue");
                    nestEnvelope.put("data", payloadData);

                    String jsonMessage = objectMapper.writeValueAsString(nestEnvelope);
                    rabbitTemplate.convertAndSend("send_abandoned_cart_email_queue", jsonMessage);

                    System.out.println("[RABBITMQ] Đã bắn lệnh gửi Email tặng mã " + voucher.getCode() + " cho User: " + userIdStr);

                    // 3. LẬP LỆNH CẤM SPAM: Đánh dấu đã nhắc ông này, khóa mõm bot trong 7 ngày
                    redisTemplate.opsForValue().set(notifiedKey, "sent", 7, TimeUnit.DAYS);

                } catch (Exception e) {
                    System.err.println("❌ Lỗi gửi RabbitMQ: " + e.getMessage());
                }
            }
        }
        System.out.println("[CRON JOB] Tuần tra hoàn tất!");
    }
}