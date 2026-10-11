import { describe, expect, it } from 'vitest';
import { thongBaoDangNhap } from './thong-bao-dang-nhap';

describe('thongBaoDangNhap', () => {
  it('SAI → câu sai tên hoặc mật khẩu', () => {
    expect(thongBaoDangNhap({ loai: 'SAI' })).toBe('Sai tên đăng nhập hoặc mật khẩu');
  });

  it('BI_CHAN → báo số phút làm tròn lên', () => {
    expect(thongBaoDangNhap({ loai: 'BI_CHAN', thuLaiSauGiay: 600 })).toBe(
      'Đăng nhập sai quá nhiều lần. Thử lại sau 10 phút',
    );
    expect(thongBaoDangNhap({ loai: 'BI_CHAN', thuLaiSauGiay: 61 })).toBe(
      'Đăng nhập sai quá nhiều lần. Thử lại sau 2 phút',
    );
    expect(thongBaoDangNhap({ loai: 'BI_CHAN', thuLaiSauGiay: 5 })).toBe(
      'Đăng nhập sai quá nhiều lần. Thử lại sau 1 phút',
    );
  });

  it('LOI_MAY_CHU → báo mã lỗi để người quản trị tra được', () => {
    expect(thongBaoDangNhap({ loai: 'LOI_MAY_CHU', ma: 403 })).toBe(
      'Máy chủ từ chối yêu cầu (mã 403). Vui lòng thử lại hoặc báo người quản trị',
    );
  });

  it('LOI_MANG → báo không kết nối được máy chủ', () => {
    expect(thongBaoDangNhap({ loai: 'LOI_MANG' })).toBe('Không kết nối được máy chủ');
  });
});
