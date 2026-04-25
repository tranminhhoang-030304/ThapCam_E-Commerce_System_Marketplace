package com.example.demo.service;

import com.example.demo.dto.CartItem;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;

@Service
public class CartService {

    @Autowired
    private StringRedisTemplate redisTemplate;

    private ObjectMapper objectMapper = new ObjectMapper();

    private String getCartKey(String userId) {
        return "cart:" + userId;
    }

    // Lấy giỏ hàng từ Redis
    public List<CartItem> getCart(String userId) {
        String cartJson = redisTemplate.opsForValue().get(getCartKey(userId));
        if (cartJson == null) return new ArrayList<>();
        try {
            return objectMapper.readValue(cartJson, new TypeReference<List<CartItem>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    // Thêm 1 sản phẩm vào giỏ (Sửa thành trả về List để Controller dùng)
    public List<CartItem> addToCart(String userId, CartItem newItem) {
        List<CartItem> cart = getCart(userId);
        boolean exists = false;
        for (CartItem item : cart) {
            // Phải trùng cả ID Sản phẩm VÀ ID Biến thể (Màu/Size) thì mới được cộng dồn
            boolean isSameProduct = item.getProductId().equals(newItem.getProductId());
            boolean isSameVariant = (item.getVariantId() == null && newItem.getVariantId() == null) ||
                    (item.getVariantId() != null && item.getVariantId().equals(newItem.getVariantId()));

            if (isSameProduct && isSameVariant) {
                item.setQuantity(item.getQuantity() + newItem.getQuantity()); // cộng dồn số lượng
                item.setProductName(newItem.getProductName()); // ghi đè tên mới nhất
                item.setPrice(newItem.getPrice());
                if (newItem.getImageUrl() != null) {
                    item.setImageUrl(newItem.getImageUrl());
                }
                exists = true;
                break;
            }
        }
        if (!exists) cart.add(newItem);
        saveCart(userId, cart);
        return cart;
    }

    // Cập nhật số lượng
    public List<CartItem> updateCartItem(String userId, String productId, String variantId, int quantity) {
        List<CartItem> cart = getCart(userId);
        for (CartItem item : cart) {
            boolean isSameProduct = item.getProductId().equals(productId);
            boolean isSameVariant = (item.getVariantId() == null && variantId == null) ||
                    (item.getVariantId() != null && item.getVariantId().equals(variantId));

            if (isSameProduct && isSameVariant) {
                item.setQuantity(quantity);
                break;
            }
        }
        saveCart(userId, cart);
        return cart;
    }

    // Xóa khỏi giỏ
    public List<CartItem> removeFromCart(String userId, String productId, String variantId) {
        List<CartItem> cart = getCart(userId);
        // Xóa nếu trùng cả Product ID và Variant ID
        cart.removeIf(item -> {
            boolean isSameProduct = item.getProductId().equals(productId);
            boolean isSameVariant = (item.getVariantId() == null && variantId == null) ||
                    (item.getVariantId() != null && item.getVariantId().equals(variantId));
            return isSameProduct && isSameVariant;
        });
        saveCart(userId, cart);
        return cart;
    }

    // Lưu giỏ hàng xuống Redis
    private void saveCart(String userId, List<CartItem> cart) {
        try {
            String cartJson = objectMapper.writeValueAsString(cart);
            redisTemplate.opsForValue().set(getCartKey(userId), cartJson);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // Xóa trắng giỏ hàng sau khi thanh toán
    public void clearCart(String userId) {
        redisTemplate.delete(getCartKey(userId));
    }

    // TÍNH TOÁN KHUYẾN MÃI MUA SỈ (Chỉ dùng để hiển thị và Checkout)
    public Map<String, Object> getCartWithVolumeDiscount(String userId) {
        List<CartItem> cart = getCart(userId); // Lấy giá gốc từ Redis
        
        long totalOriginalPrice = 0;
        long totalDiscount = 0;
        long finalTotal = 0;

        List<Map<String, Object>> displayItems = new ArrayList<>();

        for (CartItem item : cart) {
            long basePrice = item.getPrice().longValue(); // Giả sử price của sếp là BigDecimal hoặc Long
            int qty = item.getQuantity();
            long itemTotal = basePrice * qty;

            double discountPercent = 0.0;
            String note = "";

            // LOGIC MUA SỈ
            if (qty >= 10) {
                discountPercent = 0.20; // Giảm 20%
                note = "🔥 Giảm 20% (Mua sỉ từ 10 sản phẩm)";
            } else if (qty >= 5) {
                discountPercent = 0.10; // Giảm 10%
                note = "✨ Giảm 10% (Mua combo từ 5 sản phẩm)";
            }

            long discountAmount = (long) (itemTotal * discountPercent);
            long finalItemTotal = itemTotal - discountAmount;

            totalOriginalPrice += itemTotal;
            totalDiscount += discountAmount;
            finalTotal += finalItemTotal;

            // Đóng gói data cho từng món
            Map<String, Object> itemMap = new HashMap<>();
            itemMap.put("productId", item.getProductId());
            itemMap.put("variantId", item.getVariantId());
            itemMap.put("productName", item.getProductName());
            itemMap.put("quantity", qty);
            itemMap.put("imageUrl", item.getImageUrl());
            itemMap.put("originalPrice", basePrice);
            itemMap.put("finalPrice", basePrice - (long)(basePrice * discountPercent));
            itemMap.put("discountNote", note); // Frontend sẽ dựa vào đây để in dòng chữ đỏ
            itemMap.put("itemTotal", finalItemTotal);

            displayItems.add(itemMap);
        }

        // Đóng gói tổng Bill
        Map<String, Object> summary = new HashMap<>();
        summary.put("items", displayItems);
        summary.put("totalOriginalPrice", totalOriginalPrice);
        summary.put("totalVolumeDiscount", totalDiscount);
        summary.put("finalTotal", finalTotal);

        return summary;
    }
}