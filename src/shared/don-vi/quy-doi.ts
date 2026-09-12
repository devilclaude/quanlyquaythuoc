import { soLuongCoSo, soLuongHienThi, type SoLuongCoSo, type SoLuongHienThi } from '../kieu/so-luong';
import { chiaLayThuongVaDu } from '../tien/chia-nguyen';

/**
 * Hệ số quy đổi = số đơn vị cơ sở chứa trong một đơn vị hiển thị (SPEC.md §3.3).
 * Đơn vị cơ sở tự nó có hệ số 1. Phải là số nguyên >= 1 — không có đơn vị nào
 * "nhỏ hơn" đơn vị cơ sở.
 */
export function kiemTraHeSo(heSo: number): void {
  if (!Number.isInteger(heSo) || heSo < 1) {
    throw new Error(`Hệ số quy đổi phải là số nguyên >= 1, nhận được ${heSo}`);
  }
}

/**
 * Số lượng nhập ở một đơn vị hiển thị (vd. hộp, vỉ) → số lượng ở đơn vị cơ sở
 * (viên) để ghi thẻ kho. Chỉ nhân, không có phép chia nào ở chiều này.
 */
export function quyDoiSangCoSo(soLuong: SoLuongHienThi, heSo: number): SoLuongCoSo {
  kiemTraHeSo(heSo);
  return soLuongCoSo(soLuong * heSo);
}

export interface KetQuaQuyDoiTuCoSo {
  readonly soLuong: SoLuongHienThi;
  readonly duCoSo: SoLuongCoSo;
}

/**
 * Số lượng tồn ở đơn vị cơ sở → số lượng nguyên ở một đơn vị hiển thị, kèm
 * phần dư (cũng ở đơn vị cơ sở) khi không chia hết. Không làm tròn — phần dư
 * giữ nguyên để không làm trôi tồn kho.
 */
export function quyDoiTuCoSo(soLuongCoSoDauVao: SoLuongCoSo, heSo: number): KetQuaQuyDoiTuCoSo {
  kiemTraHeSo(heSo);
  const { thuong, du } = chiaLayThuongVaDu(soLuongCoSoDauVao, heSo);
  return {
    soLuong: soLuongHienThi(thuong),
    duCoSo: soLuongCoSo(du),
  };
}

/**
 * Hiển thị PHỤ dạng "≈ 4,8 hộp" cho tồn kho ở đơn vị cơ sở — SPEC.md §3.4:
 * "Quy đổi tồn ra đơn vị lớn ... chỉ hiển thị". Trả về `string` (không phải
 * SoLuongHienThi/SoLuongCoSo) để không thể vô tình đưa số gần đúng này quay
 * lại vào bất kỳ phép tính kho hay tiền nào.
 */
export function hienThiGanDung(soLuongCoSoDauVao: SoLuongCoSo, heSo: number, tenDonVi: string): string {
  kiemTraHeSo(heSo);
  const soThapPhan = soLuongCoSoDauVao / heSo;
  const chuoiSo = soThapPhan.toFixed(1).replace('.', ',');
  return `≈ ${chuoiSo} ${tenDonVi}`;
}
