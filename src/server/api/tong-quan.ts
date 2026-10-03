import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import { giaiNghiaCaiDatQuanLyLo } from '../../shared/cai-dat/giai-nghia';
import { CanhBaoCanDateResSchema, CanhBaoLechKhoResSchema } from '../../shared/hop-dong/tong-quan';
import { layCaiDatToanCuc } from '../cai-dat/doi-che-do';
import { layCanhBaoCanDate } from '../kho/canh-bao-can-date';
import { layCanhBaoLechKho } from '../kho/canh-bao-lech-kho';

type Db = ReturnType<typeof drizzle>;

/** Nối màn Tổng quan (T-034/T-055) gọi hai route dưới đây. */
export function dangKyTongQuanRoutes(app: Hono, db: Db): void {
  app.get('/canh-bao-lech-kho', (c) => {
    return c.json(CanhBaoLechKhoResSchema.parse({ canhBao: layCanhBaoLechKho(db) }));
  });

  // "Bộ lọc báo cáo cận date" (SPEC.md §3.2) — một trong ba nơi được phép gọi
  // `giaiNghiaCaiDatQuanLyLo`; tầng kho (`layCanhBaoCanDate`) không biết tới
  // cài đặt này, chỉ trả dữ liệu thô kèm `quanLyLoGhiDe` để lọc ở đây.
  app.get('/canh-bao-can-date', (c) => {
    const toanCuc = layCaiDatToanCuc(db);
    const canhBao = layCanhBaoCanDate(db).filter((cb) => giaiNghiaCaiDatQuanLyLo(toanCuc, cb.quanLyLoGhiDe ?? 'KE_THUA'));
    return c.json(CanhBaoCanDateResSchema.parse({ canhBao }));
  });
}
