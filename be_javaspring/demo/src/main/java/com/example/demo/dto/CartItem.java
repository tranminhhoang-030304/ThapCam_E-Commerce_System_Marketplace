package com.example.demo.dto;

import java.math.BigDecimal;

public class CartItem {
    private String productId;
    private String variantId;
    private String productName;
    private BigDecimal price;
    private int quantity;
    private String imageUrl;

    // Getters và Setters (Bắt buộc phải có để thư viện chuyển đổi JSON hoạt động)
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getVariantId() { return variantId; }
    public void setVariantId(String variantId) { this.variantId = variantId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}

//dto=data transfer object