import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { taoGioiHanDangNhap } from '../auth/gioi-han-dang-nhap';
import { taoNguoiDung } from '../auth/nguoi-dung';
import { type BienHono, batXacThuc } from '../auth/phan-quyen';
import { dangKyAuthRoutes } from './auth';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;
let bay: number;

function taoApp() {
  const app = new Hono<BienHono>();
  app.use('/api/*', batXacThuc(db, () => bay));
  const router = new Hono<BienHono>();
  dangKyAuthRoutes(router, db, { gioiHan: taoGioiHanDangNhap(), bayGio: () => bay });
  app.route('/api/auth', router);
  return app;
}

function dangNhap(app: Hono<BienHono>, tenDangNhap: string, matKhau: string, headers: Record<string, string> = {}) {
  return app.request('/api/auth/dang-nhap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ tenDangNhap, matKhau }),
  });
}

function layCookiePhien(res: Response): string {
  const setCookie = res.headers.get('Set-Cookie') ?? '';
  return setCookie.split(';')[0] ?? '';
}

beforeEach(() => {
  bay = Date.parse('2026-10-10T00:00:00.000Z');
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
  taoNguoiDung(db, { tenDangNhap: 'lan', tenHienThi: 'Chị Lan', matKhau: 'mat-khau-dai-du', vaiTro: 'NHAN_VIEN' });
});

afterEach(() => {
  sqlite.close();
});

describe('POST /api/auth/dang-nhap', () => {
  it('đúng tên và mật khẩu: 200, trả người dùng (không có mật khẩu) và đặt cookie phiên', async () => {
    const res = await dangNhap(taoApp(), 'lan', 'mat-khau-dai-du');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: expect.any(String),
      tenDangNhap: 'lan',
      tenHienThi: 'Chị Lan',
      vaiTro: 'NHAN_VIEN',
    });
    const setCookie = res.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toMatch(/^phien=[^;]+/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toMatch(/Max-Age=2592000/);
  });

  it('tên đăng nhập không phân biệt hoa/thường', async () => {
    const res = await dangNhap(taoApp(), 'LAN', 'mat-khau-dai-du');

    expect(res.status).toBe(200);
  });

  it('cookie không có Secure khi chạy http thuần', async () => {
    const res = await dangNhap(taoApp(), 'lan', 'mat-khau-dai-du');

    expect(res.headers.get('Set-Cookie')).not.toMatch(/Secure/i);
  });

  it('cookie có Secure khi đứng sau proxy https (X-Forwarded-Proto)', async () => {
    const res = await dangNhap(taoApp(), 'lan', 'mat-khau-dai-du', { 'X-Forwarded-Proto': 'https' });

    expect(res.headers.get('Set-Cookie')).toMatch(/Secure/i);
  });

  it('cookie có Secure khi Cloudflare báo scheme https (CF-Visitor)', async () => {
    const res = await dangNhap(taoApp(), 'lan', 'mat-khau-dai-du', { 'CF-Visitor': '{"scheme":"https"}' });

    expect(res.headers.get('Set-Cookie')).toMatch(/Secure/i);
  });

  it('sai mật khẩu và tên không tồn tại cho cùng một phản hồi 401, không đặt cookie', async () => {
    const app = taoApp();

    const saiMatKhau = await dangNhap(app, 'lan', 'sai-mat-khau-xyz');
    const khongCoTen = await dangNhap(app, 'khong-co', 'sai-mat-khau-xyz');

    expect(saiMatKhau.status).toBe(401);
    expect(khongCoTen.status).toBe(401);
    expect(await saiMatKhau.json()).toEqual({ loi: 'Sai tên đăng nhập hoặc mật khẩu' });
    expect(await khongCoTen.json()).toEqual({ loi: 'Sai tên đăng nhập hoặc mật khẩu' });
    expect(saiMatKhau.headers.get('Set-Cookie')).toBeNull();
  });

  it('tài khoản bị khoá không đăng nhập được dù đúng mật khẩu', async () => {
    sqlite.prepare("UPDATE nguoi_dung SET hoat_dong = 0 WHERE ten_dang_nhap = 'lan'").run();

    const res = await dangNhap(taoApp(), 'lan', 'mat-khau-dai-du');

    expect(res.status).toBe(401);
  });

  it('thiếu trường hoặc body không phải JSON thì 400', async () => {
    const app = taoApp();

    const thieu = await app.request('/api/auth/dang-nhap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenDangNhap: 'lan' }),
    });
    const khongPhaiJson = await app.request('/api/auth/dang-nhap', { method: 'POST', body: 'xin chao' });

    expect(thieu.status).toBe(400);
    expect(khongPhaiJson.status).toBe(400);
  });

  it('sai 5 lần liên tiếp thì lần thứ 6 bị 429 kèm Retry-After, kể cả khi đúng mật khẩu', async () => {
    const app = taoApp();
    for (let i = 0; i < 5; i++) await dangNhap(app, 'lan', 'sai-mat-khau-xyz');

    const res = await dangNhap(app, 'lan', 'mat-khau-dai-du');

    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('bị chặn theo cặp (tên, IP): IP khác vẫn đăng nhập được', async () => {
    const app = taoApp();
    for (let i = 0; i < 5; i++) await dangNhap(app, 'lan', 'sai-mat-khau-xyz', { 'CF-Connecting-IP': '1.1.1.1' });

    const res = await dangNhap(app, 'lan', 'mat-khau-dai-du', { 'CF-Connecting-IP': '2.2.2.2' });

    expect(res.status).toBe(200);
  });

  it('đăng nhập thành công đặt lại bộ đếm sai', async () => {
    const app = taoApp();
    for (let i = 0; i < 4; i++) await dangNhap(app, 'lan', 'sai-mat-khau-xyz');
    await dangNhap(app, 'lan', 'mat-khau-dai-du');

    const res = await dangNhap(app, 'lan', 'sai-mat-khau-xyz');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/toi và POST /api/auth/dang-xuat', () => {
  it('có cookie hợp lệ thì /toi trả người dùng hiện tại', async () => {
    const app = taoApp();
    const cookie = layCookiePhien(await dangNhap(app, 'lan', 'mat-khau-dai-du'));

    const res = await app.request('/api/auth/toi', { headers: { Cookie: cookie } });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tenDangNhap: 'lan', vaiTro: 'NHAN_VIEN' });
  });

  it('không có cookie thì /toi trả 401', async () => {
    const res = await taoApp().request('/api/auth/toi');

    expect(res.status).toBe(401);
  });

  it('đăng xuất: 204, xoá cookie, và cookie cũ không còn dùng được', async () => {
    const app = taoApp();
    const cookie = layCookiePhien(await dangNhap(app, 'lan', 'mat-khau-dai-du'));

    const res = await app.request('/api/auth/dang-xuat', { method: 'POST', headers: { Cookie: cookie } });

    expect(res.status).toBe(204);
    expect(res.headers.get('Set-Cookie')).toMatch(/phien=;/);
    const sau = await app.request('/api/auth/toi', { headers: { Cookie: cookie } });
    expect(sau.status).toBe(401);
  });
});
