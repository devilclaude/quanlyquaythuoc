import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { taoApp } from './app';

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

    const res = await app.request('/api/hang-hoa');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ duLieu: [] });
  });
});

describe('GET /api/cai-dat/quan-ly-lo', () => {
  it('mount đúng route con của cai-dat (T-010b)', async () => {
    const app = taoApp(db);

    const res = await app.request('/api/cai-dat/quan-ly-lo');

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
