import type { Dong } from '../kieu/dong';

const boDinhDang = new Intl.NumberFormat('en-US');

/**
 * Chèn dấu phẩy ngăn cách hàng nghìn cho một số nguyên bất kỳ (số lượng, tồn
 * kho...) — khớp cách screenshot KiotViet hiển thị
 * (`docs/reference/kiotviet/Quản trị/Danh sách hàng hóa/`). Chỉ để hiển thị,
 * không dùng lại giá trị này cho tính toán.
 */
export function dinhDangSo(soNguyen: number): string {
  return boDinhDang.format(soNguyen);
}

/** Như `dinhDangSo`, nhưng bắt buộc đầu vào đã là `Dong` — dùng cho mọi cột tiền. */
export function dinhDangTien(soTien: Dong): string {
  return dinhDangSo(soTien);
}
