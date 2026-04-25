package com.example.demo.dto;

import com.example.demo.entity.Order;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import com.example.demo.entity.OrderItem;
import java.util.List;

public class AdminOrderListResponse {
    private UUID id;
    private UUID userId;
    private String userFullName;
    private String userEmail;
    private BigDecimal totalAmount;
    private String status;
    private String shippingAddress;
    private LocalDateTime createdAt;
    private List<OrderItem> items;

    // Constructor nhận vào Entity và tự động Map sang DTO
    public AdminOrderListResponse(Order order) {
        this.id = order.getId();
        this.userId = order.getUserId();
        this.totalAmount = order.getTotalAmount();
        this.status = order.getStatus();
        this.shippingAddress = order.getShippingAddress();
        this.createdAt = order.getCreatedAt();
        this.items = order.getItems();

        if (order.getUser() != null) {
            this.userFullName = order.getUser().getFullName();
            this.userEmail = order.getUser().getEmail();
        }
    }

    // --- Sếp Generate Getters & Setters ở đây nhé ---
    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getUserFullName() { return userFullName; }
    public String getUserEmail() { return userEmail; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public String getStatus() { return status; }
    public String getShippingAddress() { return shippingAddress; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<OrderItem> getItems() { return items; }
}