package com.example.demo.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class AuthTokenFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtils jwtUtils;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // Lấy token từ header
            String jwt = parseJwt(request);

            // Nếu có token và token là hàng thật
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                // Mở token lấy dữ liệu do NestJS gửi sang
                Claims claims = jwtUtils.getClaimsFromJwtToken(jwt);
                String userId = claims.getSubject();
                String role = claims.get("role", String.class);

                // Biến cái role của NestJS thành chiếc thẻ Quyền lực của Spring
                SimpleGrantedAuthority authority = new SimpleGrantedAuthority(role);

                // Cấp giấy thông hành cho phép đi tiếp vào hệ thống
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userId, null, Collections.singletonList(authority));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            System.err.println("Không thể thiết lập xác thực: " + e.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \"Token đã hết hạn hoặc không hợp lệ! Vui lòng đăng nhập lại.\"}");
            return; 
        }
        // Cho request đi tiếp (Chỉ dành cho Token hợp lệ, hoặc API Public không cần Token)
        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        if (headerAuth != null && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7); // Cắt bỏ chữ "Bearer " để lấy đúng cái mã
        }
        return null;
    }
}