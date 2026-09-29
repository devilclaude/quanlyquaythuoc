import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import { DongBoThaoTacReqSchema, DongBoThaoTacResSchema } from '../../shared/hop-dong/dong-bo';
import { apDungLoThaoTac } from '../dong-bo/ap-dung-thao-tac';

type Db = ReturnType<typeof drizzle>;

/**
 * Nối hàng đợi thao tác offline (T-031/T-032) với máy chủ (T-033). Luôn trả
 * 200 kèm kết quả từng thao tác — không bao giờ 409/500 vì tồn không đủ
 * (SPEC.md §4.4 "máy chủ không bao giờ từ chối một đơn đã bán và đã in"), chỉ
 * 400 khi dữ liệu không đúng hợp đồng (lỗi client thật, không phải đơn đã bán).
 */
export function dangKyDongBoRoutes(app: Hono, db: Db): void {
  app.post('/', async (c) => {
    const than = DongBoThaoTacReqSchema.safeParse(await c.req.json());
    if (!than.success) {
      return c.json({ loi: 'Dữ liệu không hợp lệ', chiTiet: than.error.flatten() }, 400);
    }

    const ketQua = apDungLoThaoTac(db, than.data.thaoTac);
    return c.json(DongBoThaoTacResSchema.parse({ ketQua }), 200);
  });
}
