import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import { CanhBaoLechKhoResSchema } from '../../shared/hop-dong/tong-quan';
import { layCanhBaoLechKho } from '../kho/canh-bao-lech-kho';

type Db = ReturnType<typeof drizzle>;

/** Nối màn Tổng quan (T-034) gọi route dưới đây. */
export function dangKyTongQuanRoutes(app: Hono, db: Db): void {
  app.get('/canh-bao-lech-kho', (c) => {
    return c.json(CanhBaoLechKhoResSchema.parse({ canhBao: layCanhBaoLechKho(db) }));
  });
}
