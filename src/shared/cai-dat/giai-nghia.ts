/** Ghi đè cài đặt quản lý lô riêng cho một sản phẩm — ba trạng thái, không phải
 * boolean, vì `KE_THUA` phải phân biệt được với "tắt tường minh". */
export type GhiDeQuanLyLo = 'KE_THUA' | 'BAT' | 'TAT';

/**
 * Giải nghĩa cài đặt "quản lý theo lô" hiệu lực cho một sản phẩm (SPEC.md
 * §3.2/§4.3, ARCHITECTURE.md §5). Hàm thuần, không chạm CSDL — chỉ được gọi ở
 * validation form nhập hàng, ẩn/hiện cột trên giao diện, và bộ lọc báo cáo cận
 * date. Ưu tiên: ghi đè sản phẩm > cài đặt toàn cục.
 */
export function giaiNghiaCaiDatQuanLyLo(toanCuc: boolean, ghiDe: GhiDeQuanLyLo): boolean {
  if (ghiDe === 'BAT') return true;
  if (ghiDe === 'TAT') return false;
  return toanCuc;
}
