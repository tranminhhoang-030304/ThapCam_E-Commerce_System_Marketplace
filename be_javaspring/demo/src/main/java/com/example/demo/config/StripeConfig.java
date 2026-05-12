package com.example.demo.config;

import com.stripe.Stripe;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

@Configuration
@org.springframework.context.annotation.Lazy(false) // Bắt buộc load ngay khi app start (không bị ảnh hưởng bởi lazy-initialization)
public class StripeConfig {

    @Value("${payment.stripe.secret-key}")
    private String secretKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = secretKey;
    }
}