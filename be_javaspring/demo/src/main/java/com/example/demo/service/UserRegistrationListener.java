package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import com.example.demo.entity.Voucher;
import com.example.demo.entity.DiscountType;
import com.example.demo.repository.VoucherRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class UserRegistrationListener {

    @Autowired private VoucherRepository voucherRepository;
    @Autowired private RabbitTemplate rabbitTemplate;

    // 🔥 TAI NGHE CẮM VÀO ỐNG NƯỚC "user_registered_queue"
    @RabbitListener(queues = "user_registered_queue")
    public void handleUserRegistration(String message) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            // NestJS thường bọc data trong cái vỏ {"pattern": "...", "data": {...}}
            JsonNode root = mapper.readTree(message);
            JsonNode data = root.has("data") ? root.get("data") : root;

            String userId = data.get("userId").asText();
            String email = data.get("email").asText();
            String name = data.get("name").asText();

            // 1. CHỦ ĐỘNG ĐẺ MÃ TÂN THỦ BẢO MẬT
            String uniqueCode = "NEWBIE-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            Voucher newbieVoucher = new Voucher();
            newbieVoucher.setCode(uniqueCode);
            newbieVoucher.setDiscountType(DiscountType.FIXED_AMOUNT); // Giảm thẳng tiền mặt
            newbieVoucher.setDiscountValue(new BigDecimal("50000"));  // Tặng 50K
            newbieVoucher.setMinOrderValue(BigDecimal.ZERO);          // Mua bao nhiêu cũng giảm
            newbieVoucher.setUsageLimit(1);
            newbieVoucher.setUserId(UUID.fromString(userId));         // Khóa cứng mã này cho ông User vừa đăng ký!
            newbieVoucher.setEndDate(LocalDateTime.now().plusDays(7)); // Phải xài trong 7 ngày
            newbieVoucher.setIsActive(true);

            voucherRepository.save(newbieVoucher);
            System.out.println("🎉 Đã lưu mã TÂN THỦ " + uniqueCode + " vào DB cho User: " + userId);

            // 2. ĐÓNG GÓI CHUYỂN PHÁT NHANH SANG CHO THẰNG NESTJS MAIL
            Map<String, Object> mailPayload = new HashMap<>();
            mailPayload.put("email", email);
            mailPayload.put("name", name);
            mailPayload.put("voucherCode", uniqueCode); // Nhét cái mã vừa đẻ vào đây

            Map<String, Object> nestEnvelope = new HashMap<>();
            nestEnvelope.put("pattern", "send_welcome_email"); // Cờ hiệu để NestJS Mail nhận diện
            nestEnvelope.put("data", mailPayload);

            String jsonResponse = mapper.writeValueAsString(nestEnvelope);
            
            // Bắn vào ống nước dùng chung của hội gửi Mail
            rabbitTemplate.convertAndSend("send_email_notification_queue", jsonResponse);
            System.out.println("🚀 [RABBITMQ] Đã yêu cầu NestJS gửi mail Chào mừng kèm mã!");

        } catch (Exception e) {
            System.err.println("❌ Lỗi xử lý User đăng ký mới: " + e.getMessage());
        }
    }
}