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

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders") // Điểm chung cho mọi thao tác về Order
@CrossOrigin(origins = "${app.frontend-url:http://localhost:3000}")
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

    // 2. LẤY DANH SÁCH ĐƠN HÀNG CỦA TÔI
    @GetMapping
    public ResponseEntity<?> getMyOrders() {
        String userIdStr = getCurrentUserId();
        List<Order> orders = orderRepository.findByUserId(UUID.fromString(userIdStr));

        // Trả về dạng PaginatedResponse { items: [...] } để Frontend khỏi lỗi
        return ResponseEntity.ok(Map.of("items", orders, "total", orders.size(), "page", 1, "limit", 100));
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