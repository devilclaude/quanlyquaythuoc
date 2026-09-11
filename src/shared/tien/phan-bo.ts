import { dong, type Dong } from '../kieu/dong';
import { chiaLayThuongVaDu } from './chia-nguyen';

/**
 * Phân bổ một khoản tiền (giảm giá toàn hoá đơn) về nhiều dòng theo trọng số,
 * bằng phương pháp "số dư lớn nhất": lấy phần nguyên chia đều theo tỷ trọng,
 * rồi cộng thêm 1đ cho các dòng có phần dư lớn nhất cho tới khi khớp đúng
 * tổng gốc — không bao giờ lệch 1đ do làm tròn từng dòng độc lập.
 */
export function phanBoSoDuLonNhat(tongCanPhanBo: Dong, trongSo: readonly Dong[]): Dong[] {
  if (trongSo.length === 0) {
    if (tongCanPhanBo !== 0) {
      throw new Error('Không có dòng nào để phân bổ nhưng tổng cần phân bổ khác 0');
    }
    return [];
  }

  const tongTrongSo = trongSo.reduce((tong, w) => tong + w, 0);

  if (tongTrongSo === 0) {
    if (tongCanPhanBo !== 0) {
      throw new Error('Tổng trọng số bằng 0, không thể phân bổ khoản khác 0');
    }
    return trongSo.map(() => dong(0));
  }

  const phanRieng = trongSo.map((trongSoDong) =>
    chiaLayThuongVaDu(tongCanPhanBo * trongSoDong, tongTrongSo),
  );
  const tongThuong = phanRieng.reduce((tong, p) => tong + p.thuong, 0);
  const phanConLai = tongCanPhanBo - tongThuong;

  const thuTuUuTien = phanRieng
    .map((p, chiSo) => ({ chiSo, du: p.du }))
    .sort((a, b) => b.du - a.du || a.chiSo - b.chiSo);
  const chiSoDuocCongThem = new Set(thuTuUuTien.slice(0, phanConLai).map((x) => x.chiSo));

  return phanRieng.map((p, chiSo) => dong(p.thuong + (chiSoDuocCongThem.has(chiSo) ? 1 : 0)));
}
