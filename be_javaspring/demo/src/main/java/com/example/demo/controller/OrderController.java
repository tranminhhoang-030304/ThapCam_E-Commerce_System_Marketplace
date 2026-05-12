package com.example.demo.controller;

import com.example.demo.dto.CheckoutRequest;
import com.example.demo.entity.Order;
import com.example.demo.repository.OrderRepository;
import com.example.demo.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.PathVariable;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders") // Điểm chung cho mọi thao tác về Order
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderService orderService; // Tiêm OrderService vào đây

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Bạn chưa đăng nhập!");
        }
        return authentication.getName();
    }

    // 1. TẠO ĐƠN HÀNG (Thay thế cho CheckoutController cũ)
    @PostMapping
    public Order createOrder(@RequestBody CheckoutRequest request) {
        // Truyền cả ID người dùng và Địa chỉ xuống Service
        return orderService.checkout(getCurrentUserId(), request);
    }

    // 2. LẤY DANH SÁCH ĐƠN HÀNG CỦA TÔI (Hỗ trợ phân trang)
    @GetMapping
    public ResponseEntity<?> getMyOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int limit) {
        
        String userIdStr = getCurrentUserId();
        UUID userId = UUID.fromString(userIdStr);

        // Sử dụng Pageable để phân trang từ DB (Giảm tải cho Server và tránh lỗi Lazy)
        Pageable pageable = PageRequest.of(page, limit, Sort.by("createdAt").descending());
        Page<Order> orderPage = orderRepository.findByUserId(userId, pageable);

        // Trả về kết quả bọc trong Map để đồng bộ với Frontend
        return ResponseEntity.ok(Map.of(
            "items", orderPage.getContent(),
            "total", orderPage.getTotalElements(),
            "page", page,
            "limit", limit,
            "totalPages", orderPage.getTotalPages()
        ));
    }

    // 3. XEM CHI TIẾT 1 ĐƠN HÀNG CỦA TÔI
    @GetMapping("/{id}")
    public ResponseEntity<?> getMyOrderDetail(@PathVariable UUID id) {
        String userIdStr = getCurrentUserId();

        // Tìm đơn hàng trong DB
        Order order = orderRepository.findById(id).orElse(null);

        if (order == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Không tìm thấy đơn hàng"));
        }

        // Phải đúng là đơn của chính chủ thì mới dc xem!
        if (!order.getUserId().toString().equals(userIdStr)) {
            return ResponseEntity.status(403).body(Map.of("error", "Bạn không có quyền xem đơn hàng này"));
        }

        return ResponseEntity.ok(order);
    }
}