package com.example.demo.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000")); // Cấp phép cho Frontend cổng 3000
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS")); // Cấp phép cho các method, đặc biệt là OPTIONS
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));  // Cấp phép cho các header (để nhét JWT Token vào)
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); // Áp dụng cấu hình này cho mọi đường dẫn
        return source;
    }

    @Autowired
    private AuthTokenFilter authTokenFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 0. CẤU HÌNH CORS
                .cors(cors -> cors.configurationSource(request -> {
                    var config = new org.springframework.web.cors.CorsConfiguration();
                    // Cho phép Next.js (Cổng 3000) gọi sang
                    config.setAllowedOrigins(java.util.List.of("http://localhost:3000"));
                    // Mở toang các method, ĐẶC BIỆT LÀ PATCH
                    config.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                    config.setAllowedHeaders(java.util.List.of("*"));
                    return config;
                }))

                // 1. Tắt bảo vệ CSRF (Không cần thiết khi dùng JWT)
                .csrf(csrf -> csrf.disable())

                // 2. Chế độ Stateless (Không lưu trạng thái đăng nhập trên Server)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. Phân quyền các đường dẫn (Router)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll() // Cho phép hiển thị lỗi (không bị chặn)
                        .requestMatchers("/api/test/all").permitAll() // CẤP ĐỘ 1: Cho phép tất cả
                        .requestMatchers("/api/payment/vnpay_return").permitAll()
                        .requestMatchers("/api/payment/momo_return").permitAll()
                        .requestMatchers("/api/payment/vnpay_ipn").permitAll()
                        .requestMatchers("/api/payment/momo_ipn").permitAll()
                        .requestMatchers("/api/test/admin").hasAuthority("ROLE_ADMIN") // Chỉ Admin mới vào được
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/payment/momo_return").permitAll()
                        .requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers("/api/payment/stripe_webhook").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/payments/**", "/api/payment/**").permitAll()
                        .anyRequest().authenticated() // Mọi API khác (như api test/user, Giỏ hàng) đều phải Đăng nhập
                );

        // 4. Nhét "anh soát vé" của chúng ta lên đứng trước anh bảo vệ mặc định
        http.addFilterBefore(authTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}