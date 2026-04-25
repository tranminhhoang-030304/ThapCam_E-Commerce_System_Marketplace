package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vouchers")
@Data // Tự động tạo Getter, Setter nhờ thư viện Lombok
@NoArgsConstructor
@AllArgsConstructor
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code; // Mã nhập (VD: TET2026)

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false)
    private DiscountType discountType; 

    @Column(name = "discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue; // Giá trị giảm (VD: 10 hoặc 50000)

    @Column(name = "min_order_value", precision = 10, scale = 2)
    private BigDecimal minOrderValue; // Đơn tối thiểu mới được dùng

    @Column(name = "max_discount_amount", precision = 10, scale = 2)
    private BigDecimal maxDiscountAmount; // Mức giảm tối đa (Dành cho loại %)

    @Column(name = "start_date")
    private LocalDateTime startDate; // Giờ bắt đầu có hiệu lực

    @Column(name = "end_date")
    private LocalDateTime endDate; // Giờ hết hạn

    @Column(name = "usage_limit")
    private Integer usageLimit; // Tổng số lượt cho phép dùng (NULL = Vô hạn)

    @Column(name = "used_count")
    private Integer usedCount = 0; // Đã dùng bao nhiêu lượt

    @Column(name = "is_active")
    private Boolean isActive = true; // Trạng thái Bật/Tắt

    // NẾU NULL LÀ MÃ PUBLIC, NẾU CÓ UUID LÀ MÃ TẶNG RIÊNG
    @Column(name = "user_id")
    private UUID userId; 

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}