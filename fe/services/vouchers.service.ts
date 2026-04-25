import { springApi } from '@/lib/axiosClient';

export const VouchersService = {
  // Lấy danh sách Voucher
  getAllVouchers: async () => {
    const res = await springApi.get('/admin/vouchers');
    return res.data;
  },

  // Tạo Voucher mới
  createVoucher: async (voucherData: any) => {
    const res = await springApi.post('/admin/vouchers', voucherData);
    return res.data;
  },

  //update voucher
  updateVoucher: async (id: string, voucherData: any) => {
    const res = await springApi.put(`/admin/vouchers/${id}`, voucherData);
    return res.data;
  },

  searchVouchers: async (code: string) => {
    const res = await springApi.get(`/admin/vouchers/search?code=${code}`);
    return res.data;
  },

  toggleStatus: async (id: string) => {
    const res = await springApi.patch(`/admin/vouchers/${id}/status`);
    return res.data;
  },

  // Xóa mềm Voucher
  deleteVoucher: async (id: string) => {
    const res = await springApi.delete(`/admin/vouchers/${id}`);
    return res.data;
  },
};