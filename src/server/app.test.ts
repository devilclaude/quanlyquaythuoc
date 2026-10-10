import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { taoApp } from './app';
import { taoNguoiDung } from './auth/nguoi-dung';

type DbTest = ReturnType<typeof drizzle>;

let sqlite: Database.Database;
let db: DbTest;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
});

afterEach(() => {
  sqlite.close();
});

async function dangNhapLayCookie(app: ReturnType<typeof taoApp>, vaiTro: 'ADMIN' | 'NHAN_VIEN'): Promise<string> {
  taoNguoiDung(db, { tenDangNhap: 'nguoi-test', tenHienThi: 'Người test', matKhau: 'mat-khau-dai-du', vaiTro });
  const res = await app.request('/api/auth/dang-nhap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenDangNhap: 'nguoi-test', matKhau: 'mat-khau-dai-du' }),
  });
  return (res.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';
}

describe('GET /api/suc-khoe', () => {
  it('trả về trạng thái ok', async () => {
    const app = taoApp(db);

    const res = await app.request('/api/suc-khoe');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ trangThai: 'ok' });
  });
});

describe('GET /api/hang-hoa', () => {
  it('mount đúng route con của hang-hoa', async () => {
    const app = taoApp(db);
    const cookie = await dangNhapLayCookie(app, 'ADMIN');

    const res = await app.request('/api/hang-hoa', { headers: { Cookie: cookie } });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ duLieu: [] });
  });
});

describe('GET /api/cai-dat/quan-ly-lo', () => {
  it('mount đúng route con của cai-dat (T-010b)', async () => {
    const app = taoApp(db);
    const cookie = await dangNhapLayCookie(app, 'ADMIN');

    const res = await app.request('/api/cai-dat/quan-ly-lo', { headers: { Cookie: cookie } });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ bat: false });
  });
});

describe('CORS cho domain API tách riêng', () => {
  const ORIGIN_APP = 'https://quaythuoc.dev2sec.io.vn';

  it('origin nằm trong danh sách cho phép: trả header Access-Control-Allow-Origin', async () => {
    const app = taoApp(db, { corsOrigins: [ORIGIN_APP] });

    const res = await app.request('/api/suc-khoe', { headers: { Origin: ORIGIN_APP } });

    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN_APP);
  });

  it('origin lạ không được trả header Access-Control-Allow-Origin', async () => {
    const app = taoApp(db, { corsOrigins: [ORIGIN_APP] });

    const res = await app.request('/api/suc-khoe', { headers: { Origin: 'https://ke-xau.example' } });

    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('preflight OPTIONS cho POST có Content-Type JSON được chấp nhận từ origin của app', async () => {
    const app = taoApp(db, { corsOrigins: [ORIGIN_APP] });

    const res = await app.request('/api/hoa-don', {
      method: 'OPTIONS',
      headers: {
        Origin: ORIGIN_APP,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN_APP);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('không cấu hình danh sách origin: không bật CORS (hành vi cũ, cùng origin)', async () => {
    const app = taoApp(db);

    const res = await app.request('/api/suc-khoe', { headers: { Origin: ORIGIN_APP } });

    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('xác thực bật sẵn trong taoApp', () => {
  it('chưa đăng nhập: mọi route nghiệp vụ trả 401', async () => {
    const app = taoApp(db);

    for (const duongDan of [
      '/api/hang-hoa',
      '/api/phieu-nhap',
      '/api/tong-quan/canh-bao-lech-kho',
      '/api/cai-dat/quan-ly-lo',
    ]) {
      const res = await app.request(duongDan);
      expect(res.status, duongDan).toBe(401);
    }
  });

  it('/api/suc-khoe vẫn công khai', async () => {
    expect((await taoApp(db).request('/api/suc-khoe')).status).toBe(200);
  });

  it('đăng nhập qua taoApp rồi dùng cookie gọi được /api/auth/toi', async () => {
    const app = taoApp(db);
    const cookie = await dangNhapLayCookie(app, 'NHAN_VIEN');

    const res = await app.request('/api/auth/toi', { headers: { Cookie: cookie } });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tenDangNhap: 'nguoi-test', vaiTro: 'NHAN_VIEN' });
  });

  it('nhân viên: vào được hàng hoá (tìm hàng), bị 403 ở nhập hàng', async () => {
    const app = taoApp(db);
    const cookie = await dangNhapLayCookie(app, 'NHAN_VIEN');

    expect((await app.request('/api/hang-hoa', { headers: { Cookie: cookie } })).status).toBe(200);
    expect((await app.request('/api/phieu-nhap', { headers: { Cookie: cookie } })).status).toBe(403);
  });

  it('POST với Origin lạ bị CSRF chặn 403 trước cả đăng nhập', async () => {
    const res = await taoApp(db).request('/api/auth/dang-nhap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://ke-xau.example',
        Host: 'quaythuoc.dev2sec.io.vn',
      },
      body: JSON.stringify({ tenDangNhap: 'a', matKhau: 'b' }),
    });

    expect(res.status).toBe(403);
  });

  it('CORS cho phép gửi cookie chéo origin (credentials)', async () => {
    const origin = 'https://quaythuoc.dev2sec.io.vn';
    const res = await taoApp(db, { corsOrigins: [origin] }).request('/api/suc-khoe', {
      headers: { Origin: origin },
    });

    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});
