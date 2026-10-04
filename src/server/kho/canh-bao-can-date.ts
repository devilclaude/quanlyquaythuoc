import { eq, gt } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { ngayHomNayVN, soNgayGiuaHaiNgayVN } from '../../shared/thoi-gian/khoang-ngay-vn';
import { loHang, sanPham, tonKhoLo } from '../db/schema';

type Db = ReturnType<typeof drizzle>;

export interface CanhBaoCanDate {
  loId: string;
  chiNhanhId: string;
  sanPhamId: string;
  maHang: string;
  tenSanPham: string;
  soLo: string | null;
  hsd: string;
  /** Số ngày từ hôm nay (giờ VN) tới HSD — có thể âm nếu lô đã hết hạn. */
  soNgayConLai: number;
  /** Ngưỡng cấp bách nhất mà lô này rơi vào (BACKLOG.md T-055: "báo cáo hết hạn trong 30/60/90 ngày"). */
  nguong: 30 | 60 | 90;
  /** Luôn dương — không còn hàng thì không phải cảnh báo. */
  ton: number;
  /**
   * Ghi đè cài đặt quản lý lô của sản phẩm — dữ liệu THÔ, chưa giải nghĩa.
   * Tầng kho không được gọi `giaiNghiaCaiDatQuanLyLo` (SPEC.md §3.2,
   * `.dependency-cruiser.cjs`); lọc theo cài đặt hiệu lực (kế thừa/bật/tắt) là
   * việc của route gọi hàm này — "bộ lọc báo cáo cận date" là một trong ba nơi
   * được phép gọi hàm giải nghĩa đó.
   */
  quanLyLoGhiDe: 'BAT' | 'TAT' | null;
}

function chonNguong(soNgayConLai: number): 30 | 60 | 90 {
  if (soNgayConLai <= 30) return 30;
  if (soNgayConLai <= 60) return 60;
  return 90;
}

/**
 * Cảnh báo cận date (T-055, DOMAIN-NOTES.md B5, SPEC.md §4.1): hình chiếu suy
 * ra trực tiếp từ `ton_kho_lo`/`lo_hang`, cùng khuôn `layCanhBaoLechKho` (T-034)
 * — không lưu bảng cảnh báo riêng, luôn tính lại trên dữ liệu sống. Lô ngầm
 * định (`hsd = NULL`) không bao giờ xuất hiện — quầy chưa dùng lô thật thì báo
 * cáo rỗng, đó là đúng (BACKLOG.md).
 */
export function layCanhBaoCanDate(db: Db, hienTai: Date = new Date()): CanhBaoCanDate[] {
  const homNay = ngayHomNayVN(hienTai);

  const hang = db
    .select({
      loId: loHang.id,
      chiNhanhId: tonKhoLo.chiNhanhId,
      sanPhamId: sanPham.id,
      maHang: sanPham.maHang,
      tenSanPham: sanPham.ten,
      soLo: loHang.soLo,
      hsd: loHang.hsd,
      ton: tonKhoLo.ton,
      quanLyLoGhiDe: sanPham.quanLyLoGhiDe,
    })
    .from(tonKhoLo)
    .innerJoin(loHang, eq(loHang.id, tonKhoLo.loId))
    .innerJoin(sanPham, eq(sanPham.id, loHang.sanPhamId))
    .where(gt(tonKhoLo.ton, 0))
    .all();

  return hang
    .filter((r): r is typeof r & { hsd: string } => r.hsd !== null)
    .map((r) => ({ ...r, soNgayConLai: soNgayGiuaHaiNgayVN(homNay, r.hsd) }))
    .filter((r) => r.soNgayConLai <= 90)
    .map((r) => ({ ...r, nguong: chonNguong(r.soNgayConLai) }))
    .sort((a, b) => a.soNgayConLai - b.soNgayConLai);
}
