package com.example.demo.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    // Khởi tạo máy ghi log
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Bắt toàn bộ lỗi nghiệp vụ (như lỗi sai trạng thái, không tìm thấy đơn...)
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(RuntimeException ex) {
        // Ghi màu đỏ vào file log và console
        logger.error("❌ Lỗi Nghiệp Vụ/Hệ Thống: {}", ex.getMessage(), ex);
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    // Bắt toàn bộ các lỗi văng ra không lường trước (NullPointer, đứt kết nối DB...)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(Exception ex) {
        // Ghi log chi tiết kèm StackTrace để debug trên Render/Console
        logger.error("🔥 LỖI NGHIÊM TRỌNG HỆ THỐNG: ", ex);
        
        // Trả về thông báo lỗi chi tiết hơn một chút để sếp biết đường fix nếu là lỗi mapping JSON
        String message = ex.getMessage();
        if (message != null && message.contains("Jackson")) {
            message = "Lỗi tuần tự hóa dữ liệu (JSON Mapping). Kiểm tra quan hệ Entity!";
        } else {
            message = "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau!";
        }

        return ResponseEntity.internalServerError().body(Map.of(
            "error", message,
            "path", "GlobalExceptionHandler"
        ));
    }
}