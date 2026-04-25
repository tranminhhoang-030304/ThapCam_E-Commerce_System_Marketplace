package com.example.demo.controller;

import com.example.demo.dto.VoucherRequest;
import com.example.demo.entity.Voucher;
import com.example.demo.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/vouchers")
@RequiredArgsConstructor
public class AdminVoucherController {

    private final VoucherService voucherService;

    // API lấy toàn bộ danh sách Voucher
    @GetMapping
    public ResponseEntity<List<Voucher>> getAllVouchers() {
        return ResponseEntity.ok(voucherService.getAllVouchers());
    }

    // API tạo Voucher mới
    @PostMapping
    public ResponseEntity<Voucher> createVoucher(@RequestBody VoucherRequest request) {
        return ResponseEntity.ok(voucherService.createVoucher(request));
    }

    // API Cập nhật Voucher
    @PutMapping("/{id}")
    public ResponseEntity<Voucher> updateVoucher(@PathVariable UUID id, @RequestBody VoucherRequest request) {
        return ResponseEntity.ok(voucherService.updateVoucher(id, request));
    }

    // API Cập nhật trạng thái Voucher (Kích hoạt/Khóa)
    @PatchMapping("/{id}/status")
    public ResponseEntity<Voucher> toggleStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(voucherService.toggleVoucherStatus(id));
    }

    // Tìm kiếm Voucher theo mã
    @GetMapping("/search")
    public ResponseEntity<List<Voucher>> searchVouchers(@RequestParam String code) {
        return ResponseEntity.ok(voucherService.searchByCode(code));
    }

    // API Xóa Voucher
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteVoucher(@PathVariable UUID id) {
        voucherService.deleteVoucher(id);
        return ResponseEntity.ok(Map.of("message", "Xóa mã khuyến mãi thành công!"));
    }
}