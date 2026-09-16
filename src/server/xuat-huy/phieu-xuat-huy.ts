import { and, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { phieuXuatHuy, phieuXuatHuyDong, tonKhoLo } from '../db/schema';
import { KhongDuTonKhoError } from '../kho/fefo';
import { ghiMotDongTheKho } from '../kho/so-cai';

type Db = ReturnType<typeof drizzle>;

export class LyDoBatBuocError extends Error {
  constructor() {
    super('Lý do xuất huỷ không được để trống');
    this.name = 'LyDoBatBuocError';
  }
}

export class NguoiThucHienBatBuocError extends Error {
  constructor() {
    super('Người thực hiện xuất huỷ không được để trống');
    this.name = 'NguoiThucHienBatBuocError';
  }
}

export interface DongXuatHuy {
  id: string;
  loId: string;
  /** Dương, số lượng xuất huỷ, đơn vị cơ sở. Không thể vượt tồn hiện tại của lô. */
  soLuong: number;
}

export interface TaoPhieuXuatHuyInput {
  id: string;
  chiNhanhId: string;
  lyDo: string;
  nguoiThucHien: string;
  /** Giờ thiết bị lúc thao tác xảy ra (ISO). */
  thoiGian: string;
  dong: readonly DongXuatHuy[];
}

// Xuất huỷ (T-051, DOMAIN-NOTES.md B2): xuất khỏi kho có lý do và người thực
// hiện, ghi thẻ kho, trừ đúng lô đã chọn. Không có nhánh nào theo cài đặt quản
// lý lô (ARCHITECTURE.md §5) — hàm này chỉ biết "lô", vận hành y hệt trên lô
// ngầm định (chế độ phẳng) lẫn lô thật.
//
// Khác kiểm kê (T-050): xuất huỷ không được phép đẩy tồn xuống âm — CLAUDE.md
// cấm để tồn âm không có bản ghi giải thích, và xuất huỷ vượt tồn không phải
// một trong các trường hợp lệch kho đã biết (SPEC.md §4.4 chỉ nói tới bán khi
// offline). Huỷ vượt tồn ném KhongDuTonKhoError, không ghi gì cả.
export function taoPhieuXuatHuy(db: Db, input: TaoPhieuXuatHuyInput): void {
  if (input.lyDo.trim() === '') throw new LyDoBatBuocError();
  if (input.nguoiThucHien.trim() === '') throw new NguoiThucHienBatBuocError();

  db.transaction((tx) => {
    tx.insert(phieuXuatHuy)
      .values({
        id: input.id,
        chiNhanhId: input.chiNhanhId,
        lyDo: input.lyDo,
        nguoiThucHien: input.nguoiThucHien,
        thoiGian: input.thoiGian,
      })
      .run();

    for (const dong of input.dong) {
      const [hienTai] = tx
        .select()
        .from(tonKhoLo)
        .where(and(eq(tonKhoLo.loId, dong.loId), eq(tonKhoLo.chiNhanhId, input.chiNhanhId)))
        .all();
      const tonHienTai = hienTai?.ton ?? 0;

      if (dong.soLuong > tonHienTai) throw new KhongDuTonKhoError(dong.soLuong - tonHienTai);

      tx.insert(phieuXuatHuyDong)
        .values({ id: dong.id, phieuId: input.id, loId: dong.loId, soLuong: dong.soLuong })
        .run();

      ghiMotDongTheKho(tx, {
        id: `${dong.id}-tk`,
        chiNhanhId: input.chiNhanhId,
        loId: dong.loId,
        loai: 'XUAT_HUY',
        soLuong: -dong.soLuong,
        thoiGian: input.thoiGian,
      });
    }
  });
}
