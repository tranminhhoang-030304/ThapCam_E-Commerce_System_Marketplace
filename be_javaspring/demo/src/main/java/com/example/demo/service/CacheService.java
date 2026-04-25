package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

@Service
public class CacheService {

    @Autowired
    private CacheManager cacheManager;

    // xóa cache CHO DASHBOARD
    public void clearDashboardCache() {
        Cache dashboardCache = cacheManager.getCache("dashboard_stats");
        if (dashboardCache != null) {
            dashboardCache.clear();
            System.out.println("🧹 [Redis] Đã dọn sạch Cache Dashboard để cập nhật số liệu mới!");
        }
    }

    // Sau này có cache Sản phẩm, Danh mục... thì cứ viết thêm hàm clear ở đây
    // public void clearProductCache() { ... }
}