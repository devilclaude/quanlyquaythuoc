import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { Hono } from 'hono';
import { dangKyCaiDatRoutes } from './api/cai-dat';
import { dangKyHangHoaRoutes } from './api/hang-hoa';
import { dangKyHoaDonRoutes } from './api/hoa-don';

type Db = ReturnType<typeof drizzle>;

export function taoApp(db: Db) {
  const app = new Hono();

  app.get('/api/suc-khoe', (c) => c.json({ trangThai: 'ok' }));

  const hangHoaRouter = new Hono();
  dangKyHangHoaRoutes(hangHoaRouter, db);
  app.route('/api/hang-hoa', hangHoaRouter);

  const caiDatRouter = new Hono();
  dangKyCaiDatRoutes(caiDatRouter, db);
  app.route('/api/cai-dat', caiDatRouter);

  const hoaDonRouter = new Hono();
  dangKyHoaDonRoutes(hoaDonRouter, db);
  app.route('/api/hoa-don', hoaDonRouter);

  return app;
}
