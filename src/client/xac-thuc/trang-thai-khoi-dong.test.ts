import { describe, expect, it } from 'vitest';
import { quyetDinhKhoiDong } from './trang-thai-khoi-dong';

const NGUOI = { id: 'u1', tenDangNhap: 'lan', tenHienThi: 'Chị Lan', vaiTro: 'NHAN_VIEN' as const };
const KHAC = { id: 'u2', tenDangNhap: 'admin', tenHienThi: 'Admin', vaiTro: 'ADMIN' as const };

describe('quyetDinhKhoiDong', () => {
  it('máy chủ xác nhận phiên: dùng người của máy chủ, không phải offline', () => {
    expect(quyetDinhKhoiDong({ loai: 'OK', nguoi: NGUOI }, KHAC)).toEqual({
      loai: 'DA_DANG_NHAP',
      nguoi: NGUOI,
      tamThoiOffline: false,
    });
  });

  it('máy chủ từ chối phiên (401): phải đăng nhập lại, KHÔNG dùng người đã lưu', () => {
    expect(quyetDinhKhoiDong({ loai: 'CHUA_DANG_NHAP' }, NGUOI)).toEqual({ loai: 'CHUA_DANG_NHAP' });
  });

  it('mất mạng và có người đã lưu: vào app ở chế độ tạm offline để bán tiếp', () => {
    expect(quyetDinhKhoiDong({ loai: 'LOI_MANG' }, NGUOI)).toEqual({
      loai: 'DA_DANG_NHAP',
      nguoi: NGUOI,
      tamThoiOffline: true,
    });
  });

  it('mất mạng và chưa từng đăng nhập: không vào được, báo không kết nối', () => {
    expect(quyetDinhKhoiDong({ loai: 'LOI_MANG' }, undefined)).toEqual({
      loai: 'CHUA_DANG_NHAP',
      ghiChu: 'Không kết nối được máy chủ',
    });
  });
});
