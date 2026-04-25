package com.example.demo.repository;

import com.example.demo.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, UUID> {
    // Tìm Voucher theo mã Code (Khi khách nhập mã ở giỏ hàng)
    Optional<Voucher> findByCode(String code);
    // Kiểm tra xem user này đã được tặng mã private nào chưa
    Optional<Voucher> findByUserIdAndIsActiveTrue(UUID userId);
    List<Voucher> findByCodeContainingIgnoreCase(String code);
    List<Voucher> findByIsActiveTrue();
}