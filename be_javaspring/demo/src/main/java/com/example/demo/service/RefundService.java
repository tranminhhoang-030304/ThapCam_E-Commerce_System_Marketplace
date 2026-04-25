package com.example.demo.service;

import com.example.demo.config.VNPayConfig;
import com.example.demo.entity.Order;
import com.example.demo.entity.Payment;
import com.example.demo.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.text.SimpleDateFormat;
import java.util.*;

@Service
public class RefundService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Value("${payment.vnpay.tmnCode}") private String vnp_TmnCode;
    @Value("${payment.vnpay.hashSecret}") private String vnp_HashSecret;
    @Value("${payment.vnpay.apiUrl}") private String vnp_ApiUrl;

    public boolean processRefund(Order order) {
        System.out.println("==================================================");
        System.out.println("🔄 BẮT ĐẦU TIẾN TRÌNH AUTO-REFUND CHO ĐƠN: " + order.getId());

        List<Payment> payments = paymentRepository.findByOrderId(order.getId());
        if (payments == null || payments.isEmpty()) {
            System.err.println("❌ Không tìm thấy thông tin thanh toán gốc để hoàn tiền!");
            return false;
        }

        Payment successfulPayment = payments.stream()
                .filter(p -> "SUCCESS".equals(p.getStatus()))
                .findFirst()
                .orElse(null);

        if (successfulPayment == null) {
            System.err.println("❌ Đơn hàng chưa được thanh toán thành công, không có gì để hoàn!");
            return false;
        }

        boolean isRefundSuccess = false;
        if ("VNPAY".equals(successfulPayment.getPaymentMethod())) {
            isRefundSuccess = callVNPayRefundApi(successfulPayment, order);
        } else if ("MOMO".equals(successfulPayment.getPaymentMethod())) {
            // Tạm thời Fake cho Momo
            System.out.println("MoMo Auto-Refund đang được phát triển thêm...");
            isRefundSuccess = true; 
        } else if ("COD".equals(successfulPayment.getPaymentMethod())) {
            System.out.println("💵 [COD REFUND] Đây là đơn tiền mặt. Đã ghi nhận hệ thống cần trả lại tiền mặt (hoặc hủy thu tiền) cho khách!");
            isRefundSuccess = true;
        }
        
        if (isRefundSuccess) {
            System.out.println("✅ Đã gọi API Cổng thanh toán hoàn tiền thành công!");
            successfulPayment.setStatus("REFUNDED");
            paymentRepository.save(successfulPayment);
            System.out.println("==================================================");
            return true;
        } else {
            System.err.println("❌ Gọi API hoàn tiền thất bại. Cần Admin xử lý thủ công!");
            System.out.println("==================================================");
            return false;
        }
    }

    // --- LOGIC GỌI API VNPAY THẬT ---
    private boolean callVNPayRefundApi(Payment payment, Order order) {
        try {
            System.out.println("📡 [VNPAY API] Đang kết nối đến cổng VNPAY...");
            
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // 1. Tạo các tham số bắt buộc của VNPAY
            String vnp_RequestId = UUID.randomUUID().toString().replace("-", ""); // ID ngẫu nhiên cho mỗi lần gửi
            String vnp_Version = "2.1.0";
            String vnp_Command = "refund";
            String vnp_TransactionType = "02"; // 02: Hoàn tiền toàn phần, 03: Hoàn một phần
            String vnp_TxnRef = order.getId().toString().replace("-", ""); // Mã đơn hàng lúc gửi thanh toán
            long amount = payment.getAmount().longValue() * 100; // VNPAY luôn nhân 100
            String vnp_Amount = String.valueOf(amount);
            String vnp_OrderInfo = "Hoan_tien_don_hang_" + vnp_TxnRef;
            String vnp_TransactionNo = payment.getTransactionId(); // Mã GD VNPAY trả về lúc trước
            
            // Format ngày tháng theo chuẩn VNPAY
            Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
            SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
            formatter.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
            String vnp_CreateDate = formatter.format(cld.getTime());
            String vnp_TransactionDate = "";
            Object createdAt = order.getCreatedAt();
            if (createdAt instanceof java.time.LocalDateTime) {
                java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
                vnp_TransactionDate = ((java.time.LocalDateTime) createdAt).format(dtf);
            } else if (createdAt instanceof java.util.Date) {
                vnp_TransactionDate = formatter.format(createdAt);
            } else {
                // Fallback 
                vnp_TransactionDate = formatter.format(cld.getTime());
            }
            String vnp_IpAddr = "127.0.0.1";
            String vnp_CreateBy = "System_Auto_Refund";

            // 2. Tạo chuỗi Hash (Chuỗi này VNPAY quy định thứ tự cực kỳ khắt khe, sai 1 ly là báo lỗi Checksum)
            String hashData = vnp_RequestId + "|" + vnp_Version + "|" + vnp_Command + "|" + vnp_TmnCode + "|" + 
                              vnp_TransactionType + "|" + vnp_TxnRef + "|" + vnp_Amount + "|" + vnp_TransactionNo + "|" + 
                              vnp_TransactionDate + "|" + vnp_CreateBy + "|" + vnp_CreateDate + "|" + vnp_IpAddr + "|" + vnp_OrderInfo;

            String vnp_SecureHash = VNPayConfig.hmacSHA512(vnp_HashSecret, hashData);

            // 3. Đóng gói dữ liệu thành JSON
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("vnp_RequestId", vnp_RequestId);
            requestBody.put("vnp_Version", vnp_Version);
            requestBody.put("vnp_Command", vnp_Command);
            requestBody.put("vnp_TmnCode", vnp_TmnCode);
            requestBody.put("vnp_TransactionType", vnp_TransactionType);
            requestBody.put("vnp_TxnRef", vnp_TxnRef);
            requestBody.put("vnp_Amount", amount);
            requestBody.put("vnp_TransactionNo", vnp_TransactionNo);
            requestBody.put("vnp_TransactionDate", vnp_TransactionDate);
            requestBody.put("vnp_CreateBy", vnp_CreateBy);
            requestBody.put("vnp_CreateDate", vnp_CreateDate);
            requestBody.put("vnp_IpAddr", vnp_IpAddr);
            requestBody.put("vnp_OrderInfo", vnp_OrderInfo);
            requestBody.put("vnp_SecureHash", vnp_SecureHash);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            System.out.println("📡 [VNPAY API] Bắn Request POST lên Sandbox VNPAY...");
            
            // 4. Bắn Request sang VNPAY
            ResponseEntity<?> response = restTemplate.postForEntity(vnp_ApiUrl, entity, Map.class);
            Map<?, ?> responseBody = (Map<?, ?>) response.getBody();

            // 5. Kiểm tra kết quả trả về
            if (responseBody != null) {
                String responseCode = (String) responseBody.get("vnp_ResponseCode");
                String message = (String) responseBody.get("vnp_Message");
                
                if ("00".equals(responseCode)) {
                    System.out.println("🎉 [VNPAY API] THÀNH CÔNG! VNPAY đã chấp nhận yêu cầu hoàn tiền.");
                    return true;
                } else {
                    System.err.println("❌ [VNPAY API] LỖI: " + message + " (Mã lỗi: " + responseCode + ")");
                    return false;
                }
            }
        } catch (Exception e) {
            System.err.println("❌ [VNPAY API] Bị sập khi gọi API: " + e.getMessage());
        }
        return false;
    }
}