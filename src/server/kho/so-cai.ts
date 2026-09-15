import { and, asc, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { theKho, tonKhoLo } from '../db/schema';
import { apDungGiaVon } from './gia-von';

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
  /**
   * Tổng tiền tường minh của dòng khi là dòng VÀO có giá vốn biết trước (vd.
   * NHAP với tổng tiền T, SPEC.md §3.4). Bỏ qua với dòng RA — COGS của dòng ra
   * luôn suy ra từ bình quân gia quyền hiện có (`src/server/kho/gia-von.ts`),
   * không bao giờ nhận giá trị từ bên ngoài. Mặc định 0 khi không khai.
   */
  giaTri?: number;
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
          giaTri: dong.giaTri ?? 0,
          thoiGian: dong.thoiGian,
        })
        .run();

      const [hienTai] = tx
        .select()
        .from(tonKhoLo)
        .where(and(eq(tonKhoLo.loId, dong.loId), eq(tonKhoLo.chiNhanhId, dong.chiNhanhId)))
        .all();

      const moi = apDungGiaVon(hienTai, dong.soLuong, dong.giaTri);

      if (hienTai) {
        tx.update(tonKhoLo)
          .set({ ton: moi.ton, giaTriTon: moi.giaTriTon })
          .where(and(eq(tonKhoLo.loId, dong.loId), eq(tonKhoLo.chiNhanhId, dong.chiNhanhId)))
          .run();
      } else {
        tx.insert(tonKhoLo)
          .values({ loId: dong.loId, chiNhanhId: dong.chiNhanhId, ton: moi.ton, giaTriTon: moi.giaTriTon })
          .run();
      }
    }
  });
}

// Dựng lại bản đệm (tồn + giá trị tồn) từ sổ cái (SPEC.md §3.1: "dựng lại bản
// đệm từ sổ cái phải luôn ra cùng kết quả"; SPEC.md §3.4: giá vốn "gấp theo
// thứ tự đến máy chủ"). Dùng để kiểm chứng bất biến, hoặc khôi phục bản đệm
// nếu nó lệch vì lý do nào đó.
//
// Giá trị tồn phụ thuộc THỨ TỰ áp dụng (không như tổng số lượng, vốn giao
// hoán được bằng SUM) nên phải gấp tuần tự qua `apDungGiaVon` — cùng hàm dùng
// trong `ghiTheKho` — thay vì tổng hợp bằng SQL, để không có hai đường tính.
export function dungLaiTonKhoDem(db: Db): void {
  db.transaction((tx) => {
    const tatCaDong = tx
      .select({
        loId: theKho.loId,
        chiNhanhId: theKho.chiNhanhId,
        soLuong: theKho.soLuong,
        giaTri: theKho.giaTri,
      })
      .from(theKho)
      .orderBy(asc(theKho.thoiGianMayChu), asc(theKho.id))
      .all();

    const trangThai = new Map<string, { loId: string; chiNhanhId: string; ton: number; giaTriTon: number }>();
    for (const dong of tatCaDong) {
      const khoa = `${dong.loId}::${dong.chiNhanhId}`;
      const hienTai = trangThai.get(khoa);
      const moi = apDungGiaVon(hienTai, dong.soLuong, dong.giaTri);
      trangThai.set(khoa, { loId: dong.loId, chiNhanhId: dong.chiNhanhId, ...moi });
    }

    tx.delete(tonKhoLo).run();
    for (const { loId, chiNhanhId, ton, giaTriTon } of trangThai.values()) {
      tx.insert(tonKhoLo).values({ loId, chiNhanhId, ton, giaTriTon }).run();
    }
  });
}
