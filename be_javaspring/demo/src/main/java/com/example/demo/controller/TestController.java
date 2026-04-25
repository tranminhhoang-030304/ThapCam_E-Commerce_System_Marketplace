package com.example.demo.controller;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestController {

    // CẤP ĐỘ 1: Public (Ai cũng gọi được, không cần Token)
    @GetMapping("/all")
    public String allAccess() {
        return "Chào bạn, API này ai cũng xem được!";
    }

    // CẤP ĐỘ 2: Phải Đăng nhập (Cần có Token hợp lệ, role nào cũng được)
    @GetMapping("/user")
    public Map<String, Object> userAccess(Authentication authentication) {
        // Lấy thông tin user mà Filter đã mổ bụng từ JWT nhét vào
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Token hợp lệ!");
        response.put("username", authentication.getName()); // Tên user
        response.put("authorities", authentication.getAuthorities()); // Quyền lực (Role)
        return response;
    }

    // CẤP ĐỘ 3: Chỉ ADMIN (Cần có Token hợp lệ và mang quyền ROLE_ADMIN)
    @GetMapping("/admin")
    public String adminAccess() {
        return "Chào sếp ADMIN! API này chỉ dành cho sếp.";
    }
}