import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { Hono } from 'hono';
import { dangKyCaiDatRoutes } from './api/cai-dat';
import { dangKyDongBoRoutes } from './api/dong-bo';
import { dangKyHangHoaRoutes } from './api/hang-hoa';
import { dangKyHoaDonRoutes } from './api/hoa-don';
import { dangKyPhieuNhapRoutes } from './api/phieu-nhap';
import { dangKyTongQuanRoutes } from './api/tong-quan';
import { dangKyTraHangRoutes } from './api/tra-hang';

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

  const dongBoRouter = new Hono();
  dangKyDongBoRoutes(dongBoRouter, db);
  app.route('/api/dong-bo', dongBoRouter);

  const phieuNhapRouter = new Hono();
  dangKyPhieuNhapRoutes(phieuNhapRouter, db);
  app.route('/api/phieu-nhap', phieuNhapRouter);

  const tongQuanRouter = new Hono();
  dangKyTongQuanRoutes(tongQuanRouter, db);
  app.route('/api/tong-quan', tongQuanRouter);

  const traHangRouter = new Hono();
  dangKyTraHangRoutes(traHangRouter, db);
  app.route('/api/tra-hang', traHangRouter);

  return app;
}
