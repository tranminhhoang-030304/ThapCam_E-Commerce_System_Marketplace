package com.example.demo.config;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Bean
    public Queue orderRefundQueue() {
        return new Queue("order_refund_queue", true); // true = durable (không bị mất khi restart RabbitMQ)
    }

    @Bean
    public Queue inventoryUpdateQueue() {
        return new Queue("inventory_update_queue", true);
    }

    @Bean
    public Queue vipRewardQueue() {
        // Tham số thứ 2 là 'durable' (lưu trên đĩa cứng), thường để true
        return new Queue("send_vip_reward_queue", true); 
    }

    @Bean
    public Queue userRegisteredQueue() {
        return new Queue("user_registered_queue", true);
    }
}