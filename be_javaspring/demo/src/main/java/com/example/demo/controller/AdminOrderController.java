package com.example.demo.controller;

import com.example.demo.dto.AdminOrderListResponse;
import com.example.demo.dto.OrderStatusRequest;
import com.example.demo.entity.Order;
import com.example.demo.service.AdminOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.service.CacheService;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/orders")
@CrossOrigin(origins = "http://localhost:3000")
public class AdminOrderController {

    @Autowired private AdminOrderService adminOrderService;
    @Autowired private CacheService cacheService;

    @GetMapping("/dashboard-stats")
    public ResponseEntity<?> getDashboardStats() {
        return ResponseEntity.ok(adminOrderService.getDashboardOverview());
    }

    // 1. API LẤY DANH SÁCH ĐƠN HÀNG (ĐÃ NÂNG CẤP DTO VÀ LỌC STATUS)
    @GetMapping
    public ResponseEntity<Page<AdminOrderListResponse>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) { // Nhận thêm status từ Frontend

        // Gọi sang Service "Thái thượng lão quân" vừa nâng cấp lúc nãy
        Page<AdminOrderListResponse> orderPage = adminOrderService.getAllOrders(page, size, status);

        return ResponseEntity.ok(orderPage);
    }

    // XEM CHI TIẾT
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(adminOrderService.getOrderDetail(id));
    }

    // CẬP NHẬT TRẠNG THÁI
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable UUID id, @RequestBody OrderStatusRequest payload) {
        try {
            String newStatus = payload.getStatus();
            if (newStatus == null || newStatus.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Trạng thái không được để trống"));
            }
            //Chỉ gọi Service xử lý, tuyệt đối không tự lưu Database ở đây nữa!
            Order updatedOrder = adminOrderService.updateOrderStatus(id, newStatus);
            cacheService.clearDashboardCache();
            return ResponseEntity.ok(updatedOrder);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // API MỚI CHO GÓC NHÌN 360 ĐỘ KHÁCH HÀNG
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getCustomerOrders(@PathVariable UUID userId) {
        return ResponseEntity.ok(adminOrderService.getCustomerOrderStats(userId));
    }
}