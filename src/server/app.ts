import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { dangKyAuthRoutes } from './api/auth';
import { dangKyCaiDatRoutes } from './api/cai-dat';
import { dangKyDongBoRoutes } from './api/dong-bo';
import { dangKyHangHoaRoutes } from './api/hang-hoa';
import { dangKyHoaDonRoutes } from './api/hoa-don';
import { dangKyNguoiDungRoutes } from './api/nguoi-dung';
import { dangKyPhieuNhapRoutes } from './api/phieu-nhap';
import { dangKyTongQuanRoutes } from './api/tong-quan';
import { dangKyTraHangRoutes } from './api/tra-hang';
import { dangKyTraHangNhapRoutes } from './api/tra-hang-nhap';
import { chongCsrf } from './auth/chong-csrf';
import { taoGioiHanDangNhap } from './auth/gioi-han-dang-nhap';
import { type BienHono, batXacThuc } from './auth/phan-quyen';

type Db = ReturnType<typeof drizzle>;

export interface TuyChonApp {
  /**
   * Origin của app được phép gọi API từ trình duyệt khi API chạy ở domain riêng.
   * Rỗng/không truyền = không bật CORS: app và API cùng origin (proxy `/api`).
   */
  corsOrigins?: readonly string[];
  /** Đồng hồ (mili-giây epoch) — test truyền vào để kiểm hạn phiên. Mặc định `Date.now`. */
  bayGio?: () => number;
}

export function taoApp(db: Db, tuyChon: TuyChonApp = {}) {
  const app = new Hono<BienHono>();
  const corsOrigins = tuyChon.corsOrigins ?? [];
  const bayGio = tuyChon.bayGio ?? Date.now;

  if (corsOrigins.length > 0) {
    app.use('/api/*', cors({ origin: [...corsOrigins], credentials: true }));
  }
  // Xác thực bật sẵn, không có công tắc tắt: quên cấu hình thì đóng, không mở.
  app.use('/api/*', chongCsrf(corsOrigins));
  app.use('/api/*', batXacThuc(db, bayGio));

  const authRouter = new Hono<BienHono>();
  dangKyAuthRoutes(authRouter, db, { gioiHan: taoGioiHanDangNhap(), bayGio });
  app.route('/api/auth', authRouter);

  app.get('/api/suc-khoe', (c) => c.json({ trangThai: 'ok' }));

  // Nhân viên chỉ được tìm hàng/giá bán để bán — không xem giá vốn (spec đăng nhập).
  // Chạy sau `batXacThuc` nên đã biết người dùng; chỉ đúng GET danh sách, admin nhận nguyên.
  app.use('/api/hang-hoa', async (c, next) => {
    await next();
    if (c.req.method !== 'GET' || c.res.status !== 200 || c.get('nguoiDung')?.vaiTro !== 'NHAN_VIEN') return;
    const goc = (await c.res.clone().json()) as { duLieu?: Record<string, unknown>[] };
    const duLieu = (goc.duLieu ?? []).map((hang) =>
      Object.fromEntries(Object.entries(hang).filter(([khoa]) => khoa !== 'giaVon')),
    );
    c.res = new Response(JSON.stringify({ ...goc, duLieu }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  const hangHoaRouter = new Hono();
  dangKyHangHoaRoutes(hangHoaRouter, db);
  app.route('/api/hang-hoa', hangHoaRouter);

  const caiDatRouter = new Hono();
  dangKyCaiDatRoutes(caiDatRouter, db);
  app.route('/api/cai-dat', caiDatRouter);

  const hoaDonRouter = new Hono<BienHono>();
  dangKyHoaDonRoutes(hoaDonRouter, db);
  app.route('/api/hoa-don', hoaDonRouter);

  const dongBoRouter = new Hono<BienHono>();
  dangKyDongBoRoutes(dongBoRouter, db);
  app.route('/api/dong-bo', dongBoRouter);

  const phieuNhapRouter = new Hono();
  dangKyPhieuNhapRoutes(phieuNhapRouter, db);
  app.route('/api/phieu-nhap', phieuNhapRouter);

  const tongQuanRouter = new Hono();
  dangKyTongQuanRoutes(tongQuanRouter, db);
  app.route('/api/tong-quan', tongQuanRouter);

  const nguoiDungRouter = new Hono<BienHono>();
  dangKyNguoiDungRoutes(nguoiDungRouter, db);
  app.route('/api/nguoi-dung', nguoiDungRouter);

  const traHangRouter = new Hono();
  dangKyTraHangRoutes(traHangRouter, db);
  app.route('/api/tra-hang', traHangRouter);

  const traHangNhapRouter = new Hono();
  dangKyTraHangNhapRoutes(traHangNhapRouter, db);
  app.route('/api/tra-hang-nhap', traHangNhapRouter);

  return app;
}
