import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { chiNhanh } from './schema';

type Db = ReturnType<typeof drizzle>;

// v1 chỉ có đúng một chi nhánh (SPEC.md §3.6) và chưa có UI nào tạo/quản lý
// chi nhánh — nhưng `chi_nhanh_id` là FK bắt buộc trên `the_kho`/`ton_kho_lo`
// ngay từ đầu, nên mọi module ghi sổ cái cần một dòng thật để tham chiếu tới.
// ID cố định khiến việc "lấy hoặc tạo" idempotent qua `onConflictDoNothing`:
// hai request đồng thời không bao giờ tạo ra hai dòng đua nhau.
const CHI_NHANH_MAC_DINH_ID = 'chi-nhanh-mac-dinh';

/** Đảm bảo có sẵn một dòng chi nhánh mặc định rồi trả về id của nó. */
export function layChiNhanhMacDinh(db: Db): string {
  db.insert(chiNhanh)
    .values({ id: CHI_NHANH_MAC_DINH_ID, ten: 'Quầy chính' })
    .onConflictDoNothing()
    .run();
  return CHI_NHANH_MAC_DINH_ID;
}
