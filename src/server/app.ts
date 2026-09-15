import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { Hono } from 'hono';
import { dangKyHangHoaRoutes } from './api/hang-hoa';

type Db = ReturnType<typeof drizzle>;

export function taoApp(db: Db) {
  const app = new Hono();

  app.get('/api/suc-khoe', (c) => c.json({ trangThai: 'ok' }));

  const hangHoaRouter = new Hono();
  dangKyHangHoaRoutes(hangHoaRouter, db);
  app.route('/api/hang-hoa', hangHoaRouter);

  return app;
}
