package com.example.demo.service;

import com.example.demo.dto.VoucherRequest;
import com.example.demo.entity.Voucher;
import com.example.demo.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.UUID;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;

    // Hàm tạo Voucher mới
    public Voucher createVoucher(VoucherRequest request) {
        // Kiểm tra xem mã code này đã ai tạo chưa, tránh trùng lặp
        if (voucherRepository.findByCode(request.getCode()).isPresent()) {
            throw new RuntimeException("Mã Voucher " + request.getCode() + " đã tồn tại trên hệ thống!");
        }

        Voucher voucher = new Voucher();
        voucher.setCode(request.getCode().toUpperCase()); // Ép viết hoa hết cho chuẩn
        voucher.setDiscountType(request.getDiscountType());
        voucher.setDiscountValue(request.getDiscountValue());
        voucher.setMinOrderValue(request.getMinOrderValue());
        voucher.setMaxDiscountAmount(request.getMaxDiscountAmount());
        voucher.setStartDate(request.getStartDate());
        voucher.setEndDate(request.getEndDate());
        voucher.setUsageLimit(request.getUsageLimit());
        voucher.setUserId(request.getUserId());
        voucher.setIsActive(true);

        return voucherRepository.save(voucher);
    }

    // Hàm lấy danh sách Voucher cho Admin Dashboard
    public List<Voucher> getAllVouchers() {
        return voucherRepository.findAll();
    }

    // Hàm cập nhật Voucher
    public Voucher updateVoucher(UUID id, VoucherRequest request) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã khuyến mãi!"));

        // Nếu sếp đổi mã code thì phải check xem code mới có bị trùng không
        if (!voucher.getCode().equalsIgnoreCase(request.getCode())) {
            if (voucherRepository.findByCode(request.getCode().toUpperCase()).isPresent()) {
                throw new RuntimeException("Mã Voucher " + request.getCode() + " đã tồn tại!");
            }
            voucher.setCode(request.getCode().toUpperCase());
        }

        voucher.setDiscountType(request.getDiscountType());
        voucher.setDiscountValue(request.getDiscountValue());
        voucher.setMinOrderValue(request.getMinOrderValue());
        voucher.setMaxDiscountAmount(request.getMaxDiscountAmount());
        voucher.setUsageLimit(request.getUsageLimit());
        voucher.setStartDate(request.getStartDate());
        voucher.setEndDate(request.getEndDate());

        return voucherRepository.save(voucher);
    }

    // Hàm Bật/Tắt trạng thái Voucher
    public Voucher toggleVoucherStatus(UUID id) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã khuyến mãi!"));
        // Lật ngược trạng thái hiện tại (Đang true thì thành false, false thành true)
        voucher.setIsActive(!voucher.getIsActive()); 
        return voucherRepository.save(voucher);
    }

    // Hàm tìm kiếm Voucher theo mã code
    public List<Voucher> searchByCode(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return voucherRepository.findAll();
        }
        return voucherRepository.findByCodeContainingIgnoreCase(keyword.trim());
    }

    // Hàm xóa Voucher
    @Transactional
    public void deleteVoucher(UUID id) {
        if (!voucherRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy mã khuyến mãi để xóa!");
        }
        voucherRepository.deleteById(id);
    }
}