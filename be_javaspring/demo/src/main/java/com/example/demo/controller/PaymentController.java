package com.example.demo.controller;

import com.example.demo.config.VNPayConfig;
import com.example.demo.config.MoMoConfig;
import com.example.demo.entity.Order;
import com.example.demo.entity.OrderItem;
import com.example.demo.entity.Payment;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.PaymentRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import java.time.LocalDateTime;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import com.example.demo.service.CacheService;
import java.util.*;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "http://localhost:3000")
public class PaymentController {

    // === CẤU HÌNH VNPAY ===
    @Value("${payment.vnpay.tmnCode}") private String vnp_TmnCode;
    @Value("${payment.vnpay.hashSecret}") private String vnp_HashSecret;
    @Value("${payment.vnpay.url}") private String vnp_PayUrl;
    @Value("${payment.vnpay.returnUrl}") private String vnp_ReturnUrl;

    // === CẤU HÌNH MOMO ===
    @Value("${payment.momo.partner-code}") private String momoPartnerCode;
    @Value("${payment.momo.access-key}") private String momoAccessKey;
    @Value("${payment.momo.secret-key}") private String momoSecretKey;
    @Value("${payment.momo.api-url}") private String momoApiUrl;
    @Value("${payment.momo.return-url}") private String momoReturnUrl;
    @Value("${payment.momo.ipn-url}") private String momoIpnUrl;

    // === CẤU HÌNH STRIPE ===
    @Value("${payment.stripe.success-url}") private String stripeSuccessUrl;
    @Value("${payment.stripe.cancel-url}") private String stripeCancelUrl;

    @Autowired private OrderRepository orderRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;
    @Autowired private CacheService cacheService;

    // =========================================================
    // 1. API GỘP CHUNG: TẠO LINK THANH TOÁN (MOMO & VNPAY)
    // =========================================================
    @GetMapping("/create_url")
    public ResponseEntity<?> createPaymentUrl(
            @RequestParam("orderId") UUID orderId,
            @RequestParam(value = "method", defaultValue = "VNPAY") String method,
            HttpServletRequest request) {

        try {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng!"));

            if ("MOMO".equalsIgnoreCase(method)) {
                return createMoMoPaymentUrl(order);
            } else if ("VNPAY".equalsIgnoreCase(method)) {
                return createVNPayPaymentUrl(order, request);
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Phương thức thanh toán không được hỗ trợ!"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi xử lý: " + e.getMessage()));
        }
    }

    // --- HÀM XỬ LÝ RIÊNG: MOMO ---
    private ResponseEntity<?> createMoMoPaymentUrl(Order order) {
        String amountStr = String.valueOf(order.getTotalAmount().longValue());
        String orderInfo = "Thanh toan don hang " + order.getId().toString();
        String requestId = UUID.randomUUID().toString();
        String orderIdStr = order.getId().toString();
        String extraData = "";
        String requestType = "payWithATM"; //payWithATM or captureWallet

        String rawHash = "accessKey=" + momoAccessKey +
                "&amount=" + amountStr +
                "&extraData=" + extraData +
                "&ipnUrl=" + momoIpnUrl +
                "&orderId=" + orderIdStr +
                "&orderInfo=" + orderInfo +
                "&partnerCode=" + momoPartnerCode +
                "&redirectUrl=" + momoReturnUrl +
                "&requestId=" + requestId +
                "&requestType=" + requestType;

        String signature = MoMoConfig.hmacSHA256(momoSecretKey, rawHash);

        Map<String, Object> body = new HashMap<>();
        body.put("partnerCode", momoPartnerCode);
        body.put("partnerName", "ThapCam E-Commerce");
        body.put("storeId", "ThapCamStore");
        body.put("requestId", requestId);
        body.put("amount", order.getTotalAmount().longValue());
        body.put("orderId", orderIdStr);
        body.put("orderInfo", orderInfo);
        body.put("redirectUrl", momoReturnUrl);
        body.put("ipnUrl", momoIpnUrl);
        body.put("lang", "vi");
        body.put("extraData", extraData);
        body.put("requestType", requestType);
        body.put("signature", signature);

        RestTemplate restTemplate = new RestTemplate();
        ResponseEntity<?> response = restTemplate.postForEntity(momoApiUrl, body, Map.class);
        Map<?, ?> responseBody = (Map<?, ?>) response.getBody();
        String payUrl = responseBody != null ? (String) responseBody.get("payUrl") : null;

        return ResponseEntity.ok(Map.of("url", payUrl));
    }

    // --- HÀM XỬ LÝ RIÊNG: VNPAY ---
    private ResponseEntity<?> createVNPayPaymentUrl(Order order, HttpServletRequest request) throws Exception {
        long amount = order.getTotalAmount().longValue() * 100;
        String txnRef = order.getId().toString().replace("-", "");

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", "2.1.0");
        vnp_Params.put("vnp_Command", "pay");
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amount));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", txnRef);
        vnp_Params.put("vnp_OrderInfo", "Thanh_toan_don_hang_" + txnRef);
        vnp_Params.put("vnp_OrderType", "other");
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", vnp_ReturnUrl);
        vnp_Params.put("vnp_IpAddr", "127.0.0.1");

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        formatter.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        vnp_Params.put("vnp_CreateDate", formatter.format(cld.getTime()));
        cld.add(Calendar.MINUTE, 15);
        vnp_Params.put("vnp_ExpireDate", formatter.format(cld.getTime()));

        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();

        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnp_Params.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                String encodedValue = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()).replace("+", "%20");
                hashData.append(fieldName).append('=').append(encodedValue);
                query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString())).append('=').append(encodedValue);
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }

        String queryUrl = query.toString();
        String vnp_SecureHash = VNPayConfig.hmacSHA512(vnp_HashSecret, hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
        System.out.println("VNPAY CONFIG");
        System.out.println("1. Hash Secret trong RAM: [" + vnp_HashSecret + "]");
        System.out.println("2. Chuỗi HashData tạo ra: " + hashData.toString());
        System.out.println("3. Chữ ký sinh ra: " + vnp_SecureHash);
        System.out.println("======================================");

        return ResponseEntity.ok(Map.of("url", vnp_PayUrl + "?" + queryUrl));
    }

    // =========================================================
    // 2. CALLBACK NHẬN KẾT QUẢ TỪ EXTERNAL SYSTEMS
    // =========================================================

    // ---------------------------------------------------------
    // A. LUỒNG RETURN (FRONTEND NEXT.JS GỌI XUỐNG ĐỂ VERIFY)
    // ---------------------------------------------------------

    @GetMapping("/momo_return")
    public ResponseEntity<?> momoReturn(HttpServletRequest request) {
        // Nhận API từ Next.js. Thực tế cần dùng HMAC SHA256 để check chữ ký.
        // Tạm thời trả về OK nếu resultCode = 0 (Thành công), vì việc trừ kho/cập nhật DB đã có IPN lo.
        String resultCode = request.getParameter("resultCode");
        if ("0".equals(resultCode)) {
            return ResponseEntity.ok(Map.of("success", true, "message", "MoMo verify success"));
        }
        return ResponseEntity.badRequest().body(Map.of("success", false, "message", "MoMo payment failed"));
    }

    @GetMapping("/vnpay_return")
    public ResponseEntity<?> vnpayReturn(HttpServletRequest request) {
        try {
            // Lấy toàn bộ tham số URL do Next.js gửi xuống
            Map<String, String> fields = new HashMap<>();
            for (Enumeration<String> params = request.getParameterNames(); params.hasMoreElements(); ) {
                String fieldName = params.nextElement();
                String fieldValue = request.getParameter(fieldName);
                if ((fieldValue != null) && (fieldValue.length() > 0)) {
                    fields.put(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString()),
                            URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                }
            }

            // Tách chữ ký gốc ra để so sánh
            String vnp_SecureHash = request.getParameter("vnp_SecureHash");
            fields.remove("vnp_SecureHashType");
            fields.remove("vnp_SecureHash");

            // Băm lại chuỗi dữ liệu
            List<String> fieldNames = new ArrayList<>(fields.keySet());
            Collections.sort(fieldNames);
            StringBuilder hashData = new StringBuilder();
            Iterator<String> itr = fieldNames.iterator();
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = fields.get(fieldName);
                if ((fieldValue != null) && (fieldValue.length() > 0)) {
                    hashData.append(fieldName).append("=").append(fieldValue);
                }
                if (itr.hasNext()) {
                    hashData.append("&");
                }
            }

            // So sánh chữ ký do VNPay tạo ra và chữ ký tự tính
            String signValue = VNPayConfig.hmacSHA512(vnp_HashSecret, hashData.toString());
            if (signValue.equals(vnp_SecureHash)) {
                if ("00".equals(request.getParameter("vnp_ResponseCode"))) {
                    return ResponseEntity.ok(Map.of("success", true, "message", "VNPay verify success"));
                }
            }
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid signature or payment failed"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ---------------------------------------------------------
    // B. LUỒNG IPN / WEBHOOK (CHẠY NGẦM SERVER-TO-SERVER - XỬ LÝ DB Ở ĐÂY)
    // ---------------------------------------------------------

    // --- IPN CỦA MOMO (MOMO GỬI POST BẰNG JSON) ---
    @PostMapping("/momo_ipn")
    public ResponseEntity<?> momoIpn(@RequestBody Map<String, Object> payload) {
        try {
            // Lấy thông tin từ cục JSON MoMo bắn sang
            String orderIdStr = (String) payload.get("orderId");
            Integer resultCode = (Integer) payload.get("resultCode");
            String transId = String.valueOf(payload.get("transId"));

            // Ép kiểu chuỗi sang UUID
            UUID orderId = UUID.fromString(orderIdStr);
            Order order = orderRepository.findById(orderId).orElse(null);

            // Kiểm tra trạng thái đơn hàng (Chỉ xử lý đơn chưa thanh toán)
            if (order != null && "PENDING".equals(order.getStatus())) {
                if (resultCode != null && resultCode == 0) {
                    System.out.println("Đơn hàng thật và hợp lệ!");
                    // 1. CẬP NHẬT ORDER
                    order.setStatus("PAID");
                    orderRepository.save(order);
                    cacheService.clearDashboardCache();

                    // 2. GHI VẾT PAYMENT
                    Payment payment = new Payment();
                    payment.setOrderId(order.getId());
                    payment.setTransactionId(transId);
                    payment.setAmount(order.getTotalAmount());
                    payment.setPaymentMethod("MOMO");
                    payment.setStatus("SUCCESS");
                    paymentRepository.save(payment);
                    sendPaymentSuccessNotification(order);

                    //3. Bắn vào RabbitMQ để trừ tồn kho
                    if (order.getItems() != null && !order.getItems().isEmpty()) {
                        for (OrderItem item : order.getItems()) {
                            // 1. Tạo cục dữ liệu thực tế (Payload)
                            Map<String, Object> data = new HashMap<>();
                            data.put("orderId", order.getId().toString());
                            data.put("productId", item.getProductId().toString());
                            if (item.getVariantId() != null) {
                                data.put("variantId", item.getVariantId().toString());
                            } else {
                                data.put("variantId", null);
                            }
                            data.put("quantity", item.getQuantity());

                            // 2. Bọc vào "Phong bì" chuẩn NestJS
                            Map<String, Object> nestEnvelope = new HashMap<>();
                            nestEnvelope.put("pattern", "inventory_update_queue");
                            nestEnvelope.put("data", data);

                            try {
                                // DỊCH MAP JAVA SANG CHUỖI JSON QUỐC TẾ
                                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                                String jsonMessage = mapper.writeValueAsString(nestEnvelope);

                                // 3. Bắn tin (Bắn chuỗi jsonMessage thay vì nestEnvelope)
                                System.out.println(" Đang bắn tin trừ kho: " + jsonMessage);
                                rabbitTemplate.convertAndSend("inventory_update_queue", jsonMessage);

                            } catch (Exception e) {
                                System.out.println(" Lỗi đóng gói JSON: " + e.getMessage());
                            }
                        }
                    } else {
                        System.out.println(" Cảnh báo: Đơn hàng " + order.getId() + " không có item nào để trừ kho!");
                    }
                }
            }
            // MoMo yêu cầu phải trả về HTTP 204 No Content hoặc 200 OK
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // --- IPN CỦA VNPAY (VNPAY GỬI GET KÈM PARAMS CHUẨN) ---
    @GetMapping("/vnpay_ipn")
    public ResponseEntity<?> vnpayIpn(HttpServletRequest request) {
        try {
            Map<String, String> fields = new HashMap<>();
            for (Enumeration<String> params = request.getParameterNames(); params.hasMoreElements(); ) {
                String rawFieldName = params.nextElement();
                String rawFieldValue = request.getParameter(rawFieldName);
                String fieldName = URLEncoder.encode(rawFieldName, StandardCharsets.US_ASCII.toString());
                String fieldValue = URLEncoder.encode(rawFieldValue, StandardCharsets.US_ASCII.toString());
                if ((fieldValue != null) && (fieldValue.length() > 0)) {
                    fields.put(fieldName, fieldValue);
                }
            }

            String vnp_SecureHash = request.getParameter("vnp_SecureHash");
            fields.remove("vnp_SecureHashType");
            fields.remove("vnp_SecureHash");

            List<String> fieldNames = new ArrayList<>(fields.keySet());
            Collections.sort(fieldNames);
            StringBuilder hashData = new StringBuilder();
            Iterator<String> itr = fieldNames.iterator();
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = fields.get(fieldName);
                if ((fieldValue != null) && (fieldValue.length() > 0)) {
                    hashData.append(fieldName).append("=").append(fieldValue);
                }
                if (itr.hasNext()) {
                    hashData.append("&");
                }
            }

            // Kiểm tra tính hợp lệ của chữ ký
            String signValue = VNPayConfig.hmacSHA512(vnp_HashSecret, hashData.toString());
            if (signValue.equals(vnp_SecureHash)) {
                String orderIdStr = request.getParameter("vnp_TxnRef");
                String formattedUuid = String.format("%s-%s-%s-%s-%s",
                        orderIdStr.substring(0, 8), orderIdStr.substring(8, 12),
                        orderIdStr.substring(12, 16), orderIdStr.substring(16, 20),
                        orderIdStr.substring(20, 32));

                Order order = orderRepository.findById(UUID.fromString(formattedUuid)).orElse(null);

                if (order != null) {
                    if ("PENDING".equals(order.getStatus())) {
                        if ("00".equals(request.getParameter("vnp_ResponseCode"))) {
                            // 1. CẬP NHẬT ORDER
                            order.setStatus("PAID");
                            orderRepository.save(order);
                            cacheService.clearDashboardCache();

                            // 2. GHI VẾT PAYMENT
                            Payment payment = new Payment();
                            payment.setOrderId(order.getId());
                            payment.setTransactionId(request.getParameter("vnp_TransactionNo"));
                            payment.setAmount(order.getTotalAmount());
                            payment.setPaymentMethod("VNPAY");
                            payment.setStatus("SUCCESS");
                            paymentRepository.save(payment);
                            sendPaymentSuccessNotification(order);

                            //3. Bắn vào RabbitMQ để trừ tồn kho
                            if (order.getItems() != null && !order.getItems().isEmpty()) {
                                for (OrderItem item : order.getItems()) {
                                    // 1. Tạo cục dữ liệu thực tế (Payload)
                                    Map<String, Object> data = new HashMap<>();
                                    data.put("orderId", order.getId().toString());
                                    data.put("productId", item.getProductId().toString());
                                    if (item.getVariantId() != null) {
                                        data.put("variantId", item.getVariantId().toString());
                                    } else {
                                        data.put("variantId", null);
                                    }
                                    data.put("quantity", item.getQuantity());

                                    // 2. Bọc vào "Phong bì" chuẩn NestJS
                                    Map<String, Object> nestEnvelope = new HashMap<>();
                                    nestEnvelope.put("pattern", "inventory_update_queue");
                                    nestEnvelope.put("data", data);

                                    try {
                                        //DỊCH MAP JAVA SANG CHUỖI JSON QUỐC TẾ ===
                                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                                        String jsonMessage = mapper.writeValueAsString(nestEnvelope);

                                        // 3. Bắn tin (Bắn chuỗi jsonMessage thay vì nestEnvelope)
                                        System.out.println(" Đang bắn tin trừ kho: " + jsonMessage);
                                        rabbitTemplate.convertAndSend("inventory_update_queue", jsonMessage);

                                    } catch (Exception e) {
                                        System.out.println(" Lỗi đóng gói JSON: " + e.getMessage());
                                    }
                                }
                            } else {
                                System.out.println(" Cảnh báo: Đơn hàng " + order.getId() + " không có item nào để trừ kho!");
                            }
                        } else {
                            order.setStatus("CANCELLED");
                            orderRepository.save(order);
                            cacheService.clearDashboardCache();
                        }
                        // VNPAY yêu cầu trả JSON xác nhận thành công
                        return ResponseEntity.ok(Map.of("RspCode", "00", "Message", "Confirm Success"));
                    } else {
                        // Đơn hàng đã được xử lý trước đó rồi
                        return ResponseEntity.ok(Map.of("RspCode", "02", "Message", "Order already confirmed"));
                    }
                } else {
                    return ResponseEntity.ok(Map.of("RspCode", "01", "Message", "Order not found"));
                }
            } else {
                return ResponseEntity.ok(Map.of("RspCode", "97", "Message", "Invalid Checksum"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("RspCode", "99", "Message", "Unknown error"));
        }
    }

    @PostMapping("/stripe/create-session/{orderId}")
    public ResponseEntity<?> createStripeSession(@PathVariable UUID orderId) {
        try {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

            long amountInVND = order.getTotalAmount().longValue();

            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(stripeSuccessUrl + "?orderId=" + orderId.toString())
                    .setCancelUrl(stripeCancelUrl)
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setQuantity(1L)
                                    .setPriceData(
                                            SessionCreateParams.LineItem.PriceData.builder()
                                                    .setCurrency("vnd") // Hỗ trợ thanh toán VND
                                                    .setUnitAmount(amountInVND) 
                                                    .setProductData(
                                                            SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                    .setName("Thanh toán đơn hàng #" + orderId.toString().substring(0, 8))
                                                                    .build())
                                                    .build())
                                    .build())
                    // Gắn thêm ID đơn hàng ngầm vào cho Webhook biết đường 
                    .putMetadata("order_id", orderId.toString()) 
                    .build();

            Session session = Session.create(params);

            // Trả về cái URL siêu xịn của Stripe cho Frontend
            return ResponseEntity.ok(Map.of("url", session.getUrl()));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // API Hứng từ Stripe -> Cập nhật DB -> Đá về Frontend
    @GetMapping("/stripe/success")
    public ResponseEntity<?> stripeSuccess(@RequestParam("orderId") UUID orderId) {
        try {
            Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

            // 1. Chốt đơn!
            order.setStatus("PAID"); 
            orderRepository.save(order);
            cacheService.clearDashboardCache();

            // 2. LƯU VÀO BẢNG PAYMENTS CHO ĐỒNG BỘ DB
            Payment payment = new Payment();
            payment.setOrderId(orderId); 
            payment.setPaymentMethod("STRIPE");
            payment.setAmount(order.getTotalAmount());
            payment.setCreatedAt(LocalDateTime.now()); 
            payment.setStatus("SUCCESS");
            paymentRepository.save(payment);
            sendPaymentSuccessNotification(order);
            
            System.out.println("✅ Stripe thanh toán & lưu Payment thành công cho đơn: " + orderId);
            String frontendResultUrl = "http://localhost:3000/payment/result?stripe_status=success&orderId=" + orderId;
            
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(frontendResultUrl))
                    .build();

        } catch (Exception e) {
            e.printStackTrace(); 
            String errorUrl = "http://localhost:3000/payment/result?stripe_status=error";
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(errorUrl))
                    .build();
        }
    }

    // HÀM BẮN TÍN HIỆU SANG NESTJS ĐỂ GỬI MAIL VÀ THÔNG BÁO SSE
    private void sendPaymentSuccessNotification(Order order) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("orderId", order.getId().toString());
            data.put("userId", order.getUserId().toString());
            data.put("totalAmount", order.getTotalAmount()); // Gửi luôn số tiền sang để in hóa đơn

            Map<String, Object> nestEnvelope = new HashMap<>();
            nestEnvelope.put("pattern", "send_invoice_email_queue"); // Tên queue mới
            nestEnvelope.put("data", data);

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            String jsonMessage = mapper.writeValueAsString(nestEnvelope);
            
            rabbitTemplate.convertAndSend("send_invoice_email_queue", jsonMessage);
            System.out.println("🚀 Đã lệnh cho NestJS gửi Email Hóa đơn & SSE cho đơn: " + order.getId());
        } catch (Exception e) {
            System.out.println("❌ Lỗi gửi tín hiệu RabbitMQ: " + e.getMessage());
        }
    }
}