import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import type { KetQuaToi } from './phien-client';

export type TrangThaiXacThuc =
  | { loai: 'DANG_TAI' }
  | { loai: 'CHUA_DANG_NHAP'; ghiChu?: string }
  | { loai: 'DA_DANG_NHAP'; nguoi: NguoiDungHienTai; tamThoiOffline: boolean };

/**
 * Quyết định trạng thái lúc mở app từ kết quả hỏi máy chủ và người dùng đã lưu.
 * Người đã lưu CHỈ được dùng khi không hỏi được máy chủ (mất mạng) để quầy vẫn bán
 * được; máy chủ đã trả lời "chưa đăng nhập" thì không bao giờ dùng nó.
 */
export function quyetDinhKhoiDong(ketQua: KetQuaToi, daLuu: NguoiDungHienTai | undefined): TrangThaiXacThuc {
  if (ketQua.loai === 'OK') return { loai: 'DA_DANG_NHAP', nguoi: ketQua.nguoi, tamThoiOffline: false };
  if (ketQua.loai === 'CHUA_DANG_NHAP') return { loai: 'CHUA_DANG_NHAP' };
  if (daLuu) return { loai: 'DA_DANG_NHAP', nguoi: daLuu, tamThoiOffline: true };
  return { loai: 'CHUA_DANG_NHAP', ghiChu: 'Không kết nối được máy chủ' };
}
