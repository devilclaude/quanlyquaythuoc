import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { taoNguoiDung } from './nguoi-dung';
import { type BienHono, TEN_COOKIE_PHIEN, batXacThuc, layMucQuyen } from './phan-quyen';
import { taoPhien } from './phien';

describe('layMucQuyen — bảng quyền', () => {
  it.each([
    ['GET', '/api/suc-khoe', 'CONG_KHAI'],
    ['POST', '/api/auth/dang-nhap', 'CONG_KHAI'],
    ['OPTIONS', '/api/hoa-don', 'CONG_KHAI'],
    ['GET', '/api/auth/toi', 'DA_DANG_NHAP'],
    ['POST', '/api/auth/dang-xuat', 'DA_DANG_NHAP'],
    ['POST', '/api/hoa-don', 'NHAN_VIEN'],
    ['POST', '/api/dong-bo', 'NHAN_VIEN'],
    ['GET', '/api/hang-hoa', 'NHAN_VIEN'],
    ['GET', '/api/tra-hang', 'NHAN_VIEN'],
    ['GET', '/api/tra-hang/hoa-don/HD000001', 'NHAN_VIEN'],
    ['POST', '/api/tra-hang', 'NHAN_VIEN'],
    ['GET', '/api/hoa-don/HD000001', 'NHAN_VIEN'],
  ] as const)('%s %s → %s', (phuongThuc, duongDan, mong) => {
    expect(layMucQuyen(phuongThuc, duongDan)).toBe(mong);
  });

  it.each([
    ['GET', '/api/hang-hoa/sp-1'],
    ['POST', '/api/hang-hoa'],
    ['PUT', '/api/hang-hoa/sp-1'],
    ['DELETE', '/api/hang-hoa/sp-1'],
    ['POST', '/api/hang-hoa/sp-1/ngung-hoat-dong'],
    ['PUT', '/api/hang-hoa/sp-1/quan-ly-lo'],
    ['GET', '/api/phieu-nhap'],
    ['POST', '/api/phieu-nhap'],
    ['POST', '/api/phieu-nhap/tu-excel'],
    ['GET', '/api/tra-hang-nhap'],
    ['POST', '/api/tra-hang-nhap'],
    ['GET', '/api/tong-quan/canh-bao-lech-kho'],
    ['GET', '/api/cai-dat/quan-ly-lo'],
    ['PUT', '/api/cai-dat/quan-ly-lo'],
  ])('%s %s chỉ ADMIN', (phuongThuc, duongDan) => {
    expect(layMucQuyen(phuongThuc, duongDan)).toBe('ADMIN');
  });

  it('route không có trong bảng thì mặc định chỉ ADMIN (chặn mặc định)', () => {
    expect(layMucQuyen('GET', '/api/chua-co-gi-ca')).toBe('ADMIN');
    expect(layMucQuyen('DELETE', '/api/hoa-don/HD000001')).toBe('ADMIN');
  });

  it('không bị lừa bằng đường dẫn có tiền tố giống', () => {
    expect(layMucQuyen('GET', '/api/hang-hoa-bi-mat')).toBe('ADMIN');
    expect(layMucQuyen('POST', '/api/hoa-don-gia')).toBe('ADMIN');
  });
});

describe('batXacThuc', () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;
  let admin: NguoiDungHienTai;
  let nhanVien: NguoiDungHienTai;
  const T0 = Date.parse('2026-10-10T00:00:00.000Z');

  function taoApp() {
    const app = new Hono<BienHono>();
    app.use('/api/*', batXacThuc(db, () => T0 + 1000));
    app.all('/api/*', (c) => c.json({ ai: c.get('nguoiDung')?.tenDangNhap ?? null }));
    return app;
  }

  function cookieCua(nguoi: NguoiDungHienTai): string {
    return `${TEN_COOKIE_PHIEN}=${taoPhien(db, nguoi.id, T0).maPhien}`;
  }

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: './src/server/db/migrations' });
    admin = taoNguoiDung(db, { tenDangNhap: 'admin', tenHienThi: 'Admin', matKhau: 'mat-khau-dai-du', vaiTro: 'ADMIN' });
    nhanVien = taoNguoiDung(db, { tenDangNhap: 'lan', tenHienThi: 'Lan', matKhau: 'mat-khau-dai-du', vaiTro: 'NHAN_VIEN' });
  });

  afterEach(() => {
    sqlite.close();
  });

  it('đường công khai không cần cookie', async () => {
    const res = await taoApp().request('/api/suc-khoe');

    expect(res.status).toBe(200);
  });

  it('chưa đăng nhập vào đường cần quyền thì 401', async () => {
    const res = await taoApp().request('/api/hang-hoa');

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ loi: 'Chưa đăng nhập' });
  });

  it('cookie phiên rác thì 401', async () => {
    const res = await taoApp().request('/api/hang-hoa', { headers: { Cookie: `${TEN_COOKIE_PHIEN}=rac` } });

    expect(res.status).toBe(401);
  });

  it('nhân viên vào đường nhân viên được và route đọc được người dùng', async () => {
    const res = await taoApp().request('/api/hang-hoa', { headers: { Cookie: cookieCua(nhanVien) } });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ai: 'lan' });
  });

  it('nhân viên vào đường admin thì 403', async () => {
    const res = await taoApp().request('/api/phieu-nhap', { headers: { Cookie: cookieCua(nhanVien) } });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ loi: 'Không đủ quyền' });
  });

  it('admin vào được cả đường nhân viên lẫn đường admin', async () => {
    const cookie = cookieCua(admin);
    const app = taoApp();

    expect((await app.request('/api/hang-hoa', { headers: { Cookie: cookie } })).status).toBe(200);
    expect((await app.request('/api/phieu-nhap', { headers: { Cookie: cookie } })).status).toBe(200);
  });

  it('route chưa khai báo: nhân viên 403, admin 200', async () => {
    const app = taoApp();

    expect((await app.request('/api/chua-co-gi-ca', { headers: { Cookie: cookieCua(nhanVien) } })).status).toBe(403);
    expect((await app.request('/api/chua-co-gi-ca', { headers: { Cookie: cookieCua(admin) } })).status).toBe(200);
  });

  it('DA_DANG_NHAP: cả hai vai trò đều vào được, chưa đăng nhập thì 401', async () => {
    const app = taoApp();

    expect((await app.request('/api/auth/toi', { headers: { Cookie: cookieCua(nhanVien) } })).status).toBe(200);
    expect((await app.request('/api/auth/toi')).status).toBe(401);
  });

  it('người dùng bị khoá thì cookie cũ không còn dùng được', async () => {
    const cookie = cookieCua(nhanVien);
    sqlite.prepare('UPDATE nguoi_dung SET hoat_dong = 0 WHERE id = ?').run(nhanVien.id);

    const res = await taoApp().request('/api/hang-hoa', { headers: { Cookie: cookie } });

    expect(res.status).toBe(401);
  });
});
