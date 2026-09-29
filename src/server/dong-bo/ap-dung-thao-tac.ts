import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import type { ThaoTacBanHangOffline, ThaoTacDongBo } from '../../shared/hop-dong/dong-bo';
import { taoUlid } from '../../shared/kieu/ulid';
import { taoHoaDonTuGioHang } from '../ban-hang/tao-hoa-don';
import { layChiNhanhMacDinh } from '../db/chi-nhanh';
import { hoaDon } from '../db/schema';

type Db = ReturnType<typeof drizzle>;

export interface KetQuaApDungThaoTac {
  id: string;
  ketQua: 'DA_AP_DUNG' | 'DA_TON_TAI' | 'LOI';
  loi?: string;
}

/**
 * Áp dụng một thao tác bán hàng offline (T-033). Idempotent theo `thaoTac.id`
 * (ULID của thao tác trong hàng đợi client T-031, dùng thẳng làm `hoa_don.id`):
 * hoá đơn đã tồn tại thì trả `DA_TON_TAI`, không ghi gì thêm — SPEC.md §5.2
 * "gửi lại là no-op".
 *
 * Không bao giờ từ chối vì tồn không đủ (SPEC.md §4.4 "máy chủ không bao giờ
 * từ chối một đơn đã bán và đã in") — `choPhepTonAm: true` khi gọi
 * `taoHoaDonTuGioHang`. Lỗi nghiệp vụ thật khác (vd. giảm giá vượt tổng tiền
 * hàng — dữ liệu client hỏng) trả về `LOI` kèm thông điệp thay vì ném ra
 * ngoài, để một thao tác lỗi không chặn các thao tác khác trong cùng lô.
 */
export function apDungThaoTacBanHang(db: Db, thaoTac: ThaoTacBanHangOffline): KetQuaApDungThaoTac {
  const [daTonTai] = db.select({ id: hoaDon.id }).from(hoaDon).where(eq(hoaDon.id, thaoTac.id)).all();
  if (daTonTai) return { id: thaoTac.id, ketQua: 'DA_TON_TAI' };

  try {
    taoHoaDonTuGioHang(db, {
      id: thaoTac.id,
      chiNhanhId: layChiNhanhMacDinh(db),
      thoiGian: thaoTac.thoiGian,
      phuongThucThanhToan: thaoTac.phuongThucThanhToan,
      ...(thaoTac.giamGia !== undefined ? { giamGia: thaoTac.giamGia } : {}),
      ...(thaoTac.thuKhac !== undefined ? { thuKhac: thaoTac.thuKhac } : {}),
      maDaCap: thaoTac.maHoaDon,
      choPhepTonAm: true,
      dong: thaoTac.dong.map((d) => {
        const { loUuTienThuCong, ...con } = d;
        return {
          ...con,
          id: taoUlid(),
          ...(loUuTienThuCong !== undefined ? { loUuTienThuCong } : {}),
        };
      }),
    });
    return { id: thaoTac.id, ketQua: 'DA_AP_DUNG' };
  } catch (loi) {
    return { id: thaoTac.id, ketQua: 'LOI', loi: loi instanceof Error ? loi.message : String(loi) };
  }
}

/**
 * Áp dụng một lô thao tác theo ĐÚNG thứ tự trong mảng (thứ tự đến máy chủ —
 * SPEC.md §3.4 "giá vốn gấp theo thứ tự đến máy chủ, không hồi tố"). Một thao
 * tác lỗi không chặn các thao tác sau nó trong cùng lô.
 */
export function apDungLoThaoTac(db: Db, danhSach: readonly ThaoTacDongBo[]): KetQuaApDungThaoTac[] {
  return danhSach.map((thaoTac) => apDungThaoTacBanHang(db, thaoTac));
}
