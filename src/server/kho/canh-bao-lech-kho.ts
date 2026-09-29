import { eq, lt } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { loHang, sanPham, tonKhoLo } from '../db/schema';

type Db = ReturnType<typeof drizzle>;

export interface CanhBaoLechKho {
  loId: string;
  chiNhanhId: string;
  sanPhamId: string;
  maHang: string;
  tenSanPham: string;
  soLo: string | null;
  hsd: string | null;
  /** Luôn âm — số tồn thực nhỏ hơn 0, đơn vị cơ sở (SPEC.md §4.4). */
  ton: number;
}

/**
 * Cảnh báo lệch kho (T-034, SPEC.md §4.4/§5.4): hình chiếu suy ra trực tiếp từ
 * `ton_kho_lo`, giống `gia_von_hien_hanh` (T-007) — không lưu một bảng cảnh báo
 * riêng. Một lô còn `ton < 0` nghĩa là đang cần kiểm kê; "không tự sửa" vì chỉ
 * kiểm kê (T-050) mới ghi được bút toán đưa `ton` hết âm, "không im lặng" vì
 * hàm này luôn tính lại trên dữ liệu sống — cảnh báo tự biến mất đúng lúc kiểm
 * kê xử lý xong, không cần một trạng thái "đã xử lý" riêng để quên đồng bộ.
 */
export function layCanhBaoLechKho(db: Db): CanhBaoLechKho[] {
  return db
    .select({
      loId: loHang.id,
      chiNhanhId: tonKhoLo.chiNhanhId,
      sanPhamId: sanPham.id,
      maHang: sanPham.maHang,
      tenSanPham: sanPham.ten,
      soLo: loHang.soLo,
      hsd: loHang.hsd,
      ton: tonKhoLo.ton,
    })
    .from(tonKhoLo)
    .innerJoin(loHang, eq(loHang.id, tonKhoLo.loId))
    .innerJoin(sanPham, eq(sanPham.id, loHang.sanPhamId))
    .where(lt(tonKhoLo.ton, 0))
    .all();
}
