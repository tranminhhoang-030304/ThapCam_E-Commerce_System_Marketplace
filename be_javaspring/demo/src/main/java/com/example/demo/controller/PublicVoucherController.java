package com.example.demo.controller;

import com.example.demo.entity.Voucher;
import com.example.demo.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.ArrayList;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/vouchers") 
@RequiredArgsConstructor
public class PublicVoucherController {

    private final VoucherRepository voucherRepository;

    @GetMapping("/validate")
    public ResponseEntity<?> validateVoucher(@RequestParam String code, @RequestParam BigDecimal orderValue) {
        Voucher voucher = voucherRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Mã giảm giá không tồn tại!"));

        // Check 5 lớp bảo mật y như lúc Checkout
        if (!voucher.getIsActive()) throw new RuntimeException("Mã giảm giá này đã bị khóa!");
        if (voucher.getStartDate() != null && LocalDateTime.now().isBefore(voucher.getStartDate())) throw new RuntimeException("Mã chưa đến thời gian sử dụng!");
        if (voucher.getEndDate() != null && LocalDateTime.now().isAfter(voucher.getEndDate())) throw new RuntimeException("Mã đã hết hạn!");
        if (voucher.getUsageLimit() != null && voucher.getUsedCount() >= voucher.getUsageLimit()) throw new RuntimeException("Mã đã hết lượt sử dụng!");
        if (voucher.getMinOrderValue() != null && orderValue.compareTo(voucher.getMinOrderValue()) < 0) throw new RuntimeException("Đơn hàng chưa đạt giá trị tối thiểu để dùng mã này!");

        return ResponseEntity.ok(voucher); // Pass hết thì trả về thông tin mã cho FE tính tiền
    }

    @GetMapping("/available")
    public ResponseEntity<?> getAvailableVouchers(
            @RequestParam("userId") String userId,
            @RequestParam("orderValue") BigDecimal orderValue) {
        
        try {
            // Lấy tất cả voucher đang bật (Active)
            List<Voucher> allVouchers = voucherRepository.findByIsActiveTrue();
            LocalDateTime now = LocalDateTime.now();
            List<Voucher> validVouchers = new ArrayList<>();

            for (Voucher v : allVouchers) {
                // 1. Lọc Quyền sở hữu
                boolean isOwner = v.getUserId() == null || v.getUserId().toString().equals(userId);
                if (!isOwner) continue;

                // 2. Lọc Thời hạn
                if (v.getStartDate() != null && now.isBefore(v.getStartDate())) continue;
                if (v.getEndDate() != null && now.isAfter(v.getEndDate())) continue;

                // 3. Lọc Lượt dùng
                int currentUsed = v.getUsedCount() != null ? v.getUsedCount() : 0;
                if (v.getUsageLimit() != null && currentUsed >= v.getUsageLimit()) continue;

                // 4. Lọc Điều kiện đơn hàng
                if (v.getMinOrderValue() != null && orderValue.compareTo(v.getMinOrderValue()) < 0) continue;

                validVouchers.add(v);
            }

            return ResponseEntity.ok(validVouchers);

        } catch (Exception e) {
            System.err.println("❌ Lỗi khi quét Voucher khả dụng: ");
            e.printStackTrace(); 
            throw new RuntimeException("Lỗi hệ thống khi tìm Voucher: " + e.getMessage());
        }
    }
}