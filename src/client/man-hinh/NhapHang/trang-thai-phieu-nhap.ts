import type { TrangThaiPhieuNhap } from '../../../shared/hop-dong/phieu-nhap';
import type { MauBadge } from '../../thanh-phan';

/** Dùng chung giữa danh sách (T-041) và chi tiết — tránh import vòng giữa hai file. */
export const MAU_BADGE_TRANG_THAI: Record<TrangThaiPhieuNhap, MauBadge> = {
  PHIEU_TAM: 'trung-tinh',
  HOAN_THANH: 'tot',
};

export function nhanTrangThaiPhieuNhap(trangThai: TrangThaiPhieuNhap): string {
  return trangThai === 'HOAN_THANH' ? 'Đã nhập hàng' : 'Phiếu tạm';
}
