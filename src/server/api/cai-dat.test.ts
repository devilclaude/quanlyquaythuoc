import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh } from '../db/schema';
import { dangKyCaiDatRoutes } from './cai-dat';

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

describe('dangKyCaiDatRoutes', () => {
  function taoRouter() {
    const app = new Hono();
    dangKyCaiDatRoutes(app, db);
    return app;
  }

  it('GET /quan-ly-lo trả về { bat: false } khi chưa ai đổi (mặc định TẮT, SPEC.md §3.2)', async () => {
    const res = await taoRouter().request('/quan-ly-lo');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ bat: false });
  });

  function guiDoiToanCuc(body: unknown) {
    return taoRouter().request('/quan-ly-lo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('PUT /quan-ly-lo bật toàn cục, trả về trạng thái mới', async () => {
    const res = await guiDoiToanCuc({ bat: true });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ bat: true });

    const resSau = await taoRouter().request('/quan-ly-lo');
    await expect(resSau.json()).resolves.toEqual({ bat: true });
  });

  it('PUT /quan-ly-lo trả về 400 khi bat không phải boolean', async () => {
    const res = await guiDoiToanCuc({ bat: 'true' });

    expect(res.status).toBe(400);
  });

  it('PUT /quan-ly-lo tự tạo chi nhánh mặc định nếu bảng chi_nhanh đang rỗng, không lỗi FK', async () => {
    expect(db.select().from(chiNhanh).all()).toHaveLength(0);

    const res = await guiDoiToanCuc({ bat: true });

    expect(res.status).toBe(200);
    expect(db.select().from(chiNhanh).all().length).toBeGreaterThan(0);
  });

  it('PUT /quan-ly-lo gọi hai lần liên tiếp không tạo thêm dòng chi nhánh (idempotent)', async () => {
    await guiDoiToanCuc({ bat: true });
    await guiDoiToanCuc({ bat: false });

    expect(db.select().from(chiNhanh).all()).toHaveLength(1);
  });
});
