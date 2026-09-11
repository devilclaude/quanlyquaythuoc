export interface KetQuaChiaNguyen {
  readonly thuong: number;
  readonly du: number;
}

/**
 * Điểm chia DUY NHẤT của toàn tầng tiền — mọi hàm chia khác trong
 * src/shared/tien/** phải build trên hàm này thay vì dùng `/` trần.
 */
export function chiaLayThuongVaDu(tuSo: number, mauSo: number): KetQuaChiaNguyen {
  if (!Number.isInteger(tuSo)) {
    throw new Error(`Tử số phải là số nguyên, nhận được ${tuSo}`);
  }
  if (!Number.isInteger(mauSo) || mauSo <= 0) {
    throw new Error(`Mẫu số phải là số nguyên dương, nhận được ${mauSo}`);
  }

  // eslint-disable-next-line no-restricted-syntax -- điểm chia hợp lệ duy nhất, xem docstring
  const thuong = Math.floor(tuSo / mauSo);
  const du = tuSo - thuong * mauSo;

  return { thuong, du };
}
