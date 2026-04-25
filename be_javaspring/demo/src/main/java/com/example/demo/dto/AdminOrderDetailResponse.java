package com.example.demo.dto;

import com.example.demo.entity.Order;
import com.example.demo.entity.OrderItem;
import com.example.demo.entity.Payment;

import java.util.List;

public class AdminOrderDetailResponse {
    private Order order;
    private List<OrderItem> items;
    private Payment payment; // Có thể null nếu khách chưa trả tiền

    public AdminOrderDetailResponse(Order order, List<OrderItem> items, Payment payment) {
        this.order = order;
        this.items = items;
        this.payment = payment;
    }

    public Order getOrder() { return order; }
    public List<OrderItem> getItems() { return items; }
    public Payment getPayment() { return payment; }
}