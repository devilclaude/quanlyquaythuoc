import { and, eq, sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { theKho, tonKhoLo } from '../db/schema';

type Db = ReturnType<typeof drizzle>;

export type LoaiTheKho =
  | 'BAN'
  | 'NHAP'
  | 'TRA_HANG'
  | 'TRA_NCC'
  | 'KIEM_KE'
  | 'XUAT_HUY'
  | 'DOI_CHE_DO';

export interface DongTheKho {
  id: string;
  chiNhanhId: string;
  loId: string;
  loai: LoaiTheKho;
  /** Có dấu, đơn vị cơ sở: `+` vào kho, `−` ra kho (SPEC.md §3.1). */
  soLuong: number;
  /** Giờ thiết bị lúc thao tác xảy ra (ISO). */
  thoiGian: string;
}

// Đường code duy nhất ghi tồn kho (SPEC.md §3.1, ARCHITECTURE.md §6). Mọi lớp
// nghiệp vụ phía trên (FEFO, giá vốn, kiểm kê, đồng bộ offline...) phải gọi qua
// đây thay vì tự insert `the_kho`/`ton_kho_lo` — kể cả khi chỉ ghi một dòng,
// dùng mảng một phần tử để không có hai đường ghi khác nhau.
export function ghiTheKho(db: Db, cacDong: readonly DongTheKho[]): void {
  if (cacDong.length === 0) return;

  db.transaction((tx) => {
    for (const dong of cacDong) {
      tx.insert(theKho)
        .values({
          id: dong.id,
          chiNhanhId: dong.chiNhanhId,
          loId: dong.loId,
          loai: dong.loai,
          soLuong: dong.soLuong,
          thoiGian: dong.thoiGian,
        })
        .run();

      const [hienTai] = tx
        .select()
        .from(tonKhoLo)
        .where(and(eq(tonKhoLo.loId, dong.loId), eq(tonKhoLo.chiNhanhId, dong.chiNhanhId)))
        .all();

      if (hienTai) {
        tx.update(tonKhoLo)
          .set({ ton: hienTai.ton + dong.soLuong })
          .where(and(eq(tonKhoLo.loId, dong.loId), eq(tonKhoLo.chiNhanhId, dong.chiNhanhId)))
          .run();
      } else {
        tx.insert(tonKhoLo)
          .values({ loId: dong.loId, chiNhanhId: dong.chiNhanhId, ton: dong.soLuong })
          .run();
      }
    }
  });
}

// Dựng lại bản đệm từ sổ cái (SPEC.md §3.1: "dựng lại bản đệm từ sổ cái phải
// luôn ra cùng kết quả"). Dùng để kiểm chứng bất biến, hoặc khôi phục bản đệm
// nếu nó lệch vì lý do nào đó.
export function dungLaiTonKhoDem(db: Db): void {
  db.transaction((tx) => {
    const tongHop = tx
      .select({
        loId: theKho.loId,
        chiNhanhId: theKho.chiNhanhId,
        ton: sql<number>`sum(${theKho.soLuong})`.as('ton'),
      })
      .from(theKho)
      .groupBy(theKho.loId, theKho.chiNhanhId)
      .all();

    tx.delete(tonKhoLo).run();
    for (const dong of tongHop) {
      tx.insert(tonKhoLo).values({ loId: dong.loId, chiNhanhId: dong.chiNhanhId, ton: dong.ton }).run();
    }
  });
}
