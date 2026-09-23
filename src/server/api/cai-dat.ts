import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import { CaiDatToanCucResSchema, DoiCaiDatToanCucReqSchema } from '../../shared/hop-dong/cai-dat';
import { doiCaiDatToanCuc, layCaiDatToanCuc } from '../cai-dat/doi-che-do';
import { layChiNhanhMacDinh } from '../db/chi-nhanh';

type Db = ReturnType<typeof drizzle>;

/** Không có UI (T-010b) — nối màn cài đặt là T-010c. */
export function dangKyCaiDatRoutes(app: Hono, db: Db): void {
  app.get('/quan-ly-lo', (c) => {
    return c.json(CaiDatToanCucResSchema.parse({ bat: layCaiDatToanCuc(db) }));
  });

  app.put('/quan-ly-lo', async (c) => {
    const than = DoiCaiDatToanCucReqSchema.safeParse(await c.req.json());
    if (!than.success) {
      return c.json({ loi: 'Dữ liệu không hợp lệ', chiTiet: than.error.flatten() }, 400);
    }

    doiCaiDatToanCuc(db, {
      bat: than.data.bat,
      chiNhanhId: layChiNhanhMacDinh(db),
      thoiGian: new Date().toISOString(),
    });

    return c.json(CaiDatToanCucResSchema.parse({ bat: layCaiDatToanCuc(db) }));
  });
}
