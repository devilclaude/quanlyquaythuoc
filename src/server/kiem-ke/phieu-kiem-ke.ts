import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { phieuKiemKe, phieuKiemKeDong, tonKhoLo } from '../db/schema';
import { ghiMotDongTheKho } from '../kho/so-cai';

type Db = ReturnType<typeof drizzle>;

export class LyDoBatBuocError extends Error {
  constructor() {
    super('Lý do kiểm kê không được để trống');
    this.name = 'LyDoBatBuocError';
  }
}

export interface DongKiemKe {
  id: string;
  loId: string;
  /** Số đếm được ngoài đời, đơn vị cơ sở. Không thể âm — tầng CSDL cũng chặn. */
  soLuongThucTe: number;
}

export interface TaoPhieuKiemKeInput {
  id: string;
  chiNhanhId: string;
  lyDo: string;
  /** Giờ thiết bị lúc đếm (ISO). */
  thoiGian: string;
  dong: readonly DongKiemKe[];
}

// Kiểm kê (T-050, SPEC.md §6.3): đếm thực tế theo lô, so với sổ sách, tạo phiếu
// điều chỉnh có lý do, ghi thẻ kho. Không có nhánh nào theo cài đặt quản lý lô
// (ARCHITECTURE.md §5) — hàm này chỉ biết "lô", vận hành y hệt trên lô ngầm
// định (chế độ phẳng) lẫn lô thật. "Gán lô thật cho tồn cũ ở lô ngầm định" cũng
// không cần code riêng: đó chỉ là một phiếu có hai dòng — giảm lô ngầm định,
// tăng lô thật tương ứng — qua đúng cơ chế so sánh sổ sách/thực tế bên dưới.
export function taoPhieuKiemKe(db: Db, input: TaoPhieuKiemKeInput): void {
  if (input.lyDo.trim() === '') throw new LyDoBatBuocError();

  db.transaction((tx) => {
    tx.insert(phieuKiemKe)
      .values({ id: input.id, chiNhanhId: input.chiNhanhId, lyDo: input.lyDo, thoiGian: input.thoiGian })
      .run();

    for (const dong of input.dong) {
      const [hienTai] = tx
        .select()
        .from(tonKhoLo)
        .where(and(eq(tonKhoLo.loId, dong.loId), eq(tonKhoLo.chiNhanhId, input.chiNhanhId)))
        .all();
      const soLuongSoSach = hienTai?.ton ?? 0;

      tx.insert(phieuKiemKeDong)
        .values({
          id: dong.id,
          phieuId: input.id,
          loId: dong.loId,
          soLuongSoSach,
          soLuongThucTe: dong.soLuongThucTe,
        })
        .run();

      const chenhLech = dong.soLuongThucTe - soLuongSoSach;
      if (chenhLech !== 0) {
        ghiMotDongTheKho(tx, {
          id: `${dong.id}-tk`,
          chiNhanhId: input.chiNhanhId,
          loId: dong.loId,
          loai: 'KIEM_KE',
          soLuong: chenhLech,
          thoiGian: input.thoiGian,
        });
      }
    }
  });
}
