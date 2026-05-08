package com.example.demo.controller;

import com.example.demo.dto.CartItem;
import com.example.demo.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@CrossOrigin(origins = "${app.frontend-url:http://localhost:3000}")
public class CartController {

    @Autowired
    private CartService cartService;

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Bạn chưa đăng nhập hoặc Token không hợp lệ!");
        }
        return authentication.getName();
    }

    @GetMapping
    public ResponseEntity<?> getCart() {
        return ResponseEntity.ok(cartService.getCartWithVolumeDiscount(getCurrentUserId()));
    }

    @PostMapping("/items")
    public ResponseEntity<?> addToCart(@RequestBody CartItem cartItem) {
        cartService.addToCart(getCurrentUserId(), cartItem);
        // Trả về cục data đã tính toán lại
        return ResponseEntity.ok(cartService.getCartWithVolumeDiscount(getCurrentUserId()));
    }

    //lấy variantId từ cartItem ra đưa cho Service
    @PutMapping("/items/{productId}")
    public ResponseEntity<?> updateCartItem(
            @PathVariable String productId,
            @RequestBody CartItem cartItem) {

        cartService.updateCartItem(getCurrentUserId(), productId, cartItem.getVariantId(), cartItem.getQuantity());
        return ResponseEntity.ok(cartService.getCartWithVolumeDiscount(getCurrentUserId()));
    }

    // Nhận thêm variantId qua tham số URL (?variantId=...)
    @DeleteMapping("/items/{productId}")
    public ResponseEntity<?> removeFromCart(
            @PathVariable String productId,
            @RequestParam(required = false) String variantId) { // required = false để không bắt buộc

        cartService.removeFromCart(getCurrentUserId(), productId, variantId);
        return ResponseEntity.ok(cartService.getCartWithVolumeDiscount(getCurrentUserId()));
    }
}