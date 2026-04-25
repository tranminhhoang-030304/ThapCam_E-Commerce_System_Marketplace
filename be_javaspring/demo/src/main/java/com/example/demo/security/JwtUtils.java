package com.example.demo.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Component
public class JwtUtils {

    // Lấy chìa khóa bí mật từ file application.yml
    @Value("${jwt.secret}")
    private String jwtSecret;

    // Biến chuỗi String thành SecretKey chuẩn của thuật toán HMAC-SHA
    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // Hàm kiểm tra token có hợp lệ/hết hạn chưa
    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(authToken);
            return true;
        } catch (Exception e) {
            System.err.println("Lỗi xác thực JWT: " + e.getMessage());
        }
        return false;
    }

    // Hàm mổ bụng token lấy dữ liệu (Payload)
    public Claims getClaimsFromJwtToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}