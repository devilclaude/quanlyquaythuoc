import type { KetQuaDangNhap } from './phien-client';

type KetQuaLoi = Exclude<KetQuaDangNhap, { loai: 'OK' }>;

export function thongBaoDangNhap(ketQua: KetQuaLoi): string {
  if (ketQua.loai === 'SAI') return 'Sai tên đăng nhập hoặc mật khẩu';
  if (ketQua.loai === 'BI_CHAN') {
    return `Đăng nhập sai quá nhiều lần. Thử lại sau ${Math.max(1, Math.ceil(ketQua.thuLaiSauGiay / 60))} phút`;
  }
  return 'Không kết nối được máy chủ';
}
