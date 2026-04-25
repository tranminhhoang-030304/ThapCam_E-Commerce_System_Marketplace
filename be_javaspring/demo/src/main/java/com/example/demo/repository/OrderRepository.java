package com.example.demo.repository;

import com.example.demo.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    List<Order> findByUserId(UUID uuid);
    Page<Order> findByStatus(String status, Pageable pageable);

    //1. Tính tổng doanh thu toàn hệ thống (Chỉ lấy PAID, COMPLETED)
    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.status IN ('PAID', 'COMPLETED')")
    BigDecimal calculateTotalRevenue();

    // 2. Tính doanh thu trong một khoảng thời gian (Dùng cho biểu đồ 7 ngày)
    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.status IN ('PAID', 'COMPLETED') AND o.createdAt >= :startDate AND o.createdAt < :endDate")
    BigDecimal calculateRevenueBetweenDates(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}