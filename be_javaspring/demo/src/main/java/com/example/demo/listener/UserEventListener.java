package com.example.demo.listener;

import com.example.demo.entity.DiscountType;
import com.example.demo.entity.Voucher;
import com.example.demo.repository.VoucherRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class UserEventListener {

    @Autowired private VoucherRepository voucherRepository;
    @Autowired private RabbitTemplate rabbitTemplate;

    // LẮNG NGHE TỪ NESTJS
    @RabbitListener(queues = "user_registered_queue")
    public void handleUserRegistration(String jsonMessage) {
        try {
            // 1. Giải mã thông điệp NestJS gửi sang
            ObjectMapper mapper = new ObjectMapper();
            JsonNode payload = mapper.readTree(jsonMessage).get("data"); 
            String userId = payload.get("userId").asText();
            String email = payload.get("email").asText();
            String name = payload.get("name").asText();

            // 2. Tạo mã Tân thủ siêu xịn (NEWBIE-XXXXXX)
            String newbieCode = "NEWBIE-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            Voucher newbieVoucher = new Voucher();
            newbieVoucher.setCode(newbieCode);
            newbieVoucher.setDiscountType(DiscountType.FIXED_AMOUNT); // Giảm tiền mặt
            newbieVoucher.setDiscountValue(new BigDecimal("50000")); // 50.000 VNĐ
            newbieVoucher.setMinOrderValue(new BigDecimal("0"));
            newbieVoucher.setUsageLimit(1);
            newbieVoucher.setUserId(UUID.fromString(userId)); // Khóa cứng vào khách này
            newbieVoucher.setEndDate(LocalDateTime.now().plusDays(7)); // Hạn xài 7 ngày
            newbieVoucher.setIsActive(true);
            voucherRepository.save(newbieVoucher);

            System.out.println("🎉 Đã đẻ mã Tân thủ " + newbieCode + " cho User: " + name);

            // 3. Vòng ngược lại: Ra lệnh cho NestJS Mailer gửi thư
            Map<String, Object> mailData = new HashMap<>();
            mailData.put("email", email);
            mailData.put("name", name);
            mailData.put("voucherCode", newbieCode);

            Map<String, Object> nestEnvelope = new HashMap<>();
            nestEnvelope.put("pattern", "send_welcome_email"); // Cờ hiệu quen thuộc của MailModule
            nestEnvelope.put("data", mailData);

            rabbitTemplate.convertAndSend("send_email_notification_queue", mapper.writeValueAsString(nestEnvelope));
            System.out.println("🚀 Đã bắn lệnh gửi Welcome Email sang cho NestJS!");

        } catch (Exception e) {
            System.err.println("❌ Lỗi xử lý User đăng ký mới: " + e.getMessage());
        }
    }
}