package com.example.demo.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "order_items")
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    @JsonIgnore
    private Order order;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "variant_id")
    private UUID variantId;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "price_at_buy")
    private BigDecimal priceAtBuy;

    private int quantity;

    // Getters & Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public UUID getOrderId() {
        return this.order != null ? this.order.getId() : null;
    }
    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public BigDecimal getPriceAtBuy() { return priceAtBuy; }
    public void setPriceAtBuy(BigDecimal priceAtBuy) { this.priceAtBuy = priceAtBuy; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public UUID getVariantId() { return variantId; }
    public void setVariantId(UUID variantId) { this.variantId = variantId; }
}