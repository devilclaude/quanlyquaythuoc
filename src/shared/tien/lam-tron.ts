import { dong, type Dong } from '../kieu/dong';
import { chiaLayThuongVaDu } from './chia-nguyen';

/**
 * Chia rồi làm tròn nửa lên ra số nguyên đồng — dùng cho COGS dòng bán và
 * giảm giá % trên dòng, theo bảng làm tròn ở SPEC.md §3.4.
 *
 * Công thức nguyên: round_half_up(a/b) = floor((2a+b) / 2b), tránh phép chia
 * số thực nên không tích luỹ sai số.
 */
export function chiaLamTronNuaLen(tuSo: number, mauSo: number): Dong {
  if (!Number.isInteger(mauSo) || mauSo <= 0) {
    throw new Error(`Mẫu số phải là số nguyên dương, nhận được ${mauSo}`);
  }

  const { thuong } = chiaLayThuongVaDu(2 * tuSo + mauSo, 2 * mauSo);

  return dong(thuong);
}
