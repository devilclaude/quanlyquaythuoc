import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { layChiNhanhMacDinh } from '../db/chi-nhanh';
import { loHang, sanPham } from '../db/schema';
import { ghiTheKho } from '../kho/so-cai';
import { dangKyTongQuanRoutes } from './tong-quan';

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

describe('dangKyTongQuanRoutes', () => {
  function taoRouter() {
    const app = new Hono();
    dangKyTongQuanRoutes(app, db);
    return app;
  }

  it('GET /canh-bao-lech-kho trả về rỗng khi không có lô nào tồn âm', async () => {
    const res = await taoRouter().request('/canh-bao-lech-kho');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ canhBao: [] });
  });

  it('GET /canh-bao-lech-kho trả về đúng lô đang tồn âm kèm mã/tên hàng để đi kiểm kê', async () => {
    const chiNhanhId = layChiNhanhMacDinh(db);
    db.insert(sanPham).values({ id: 'sp-1', maHang: 'SP001', ten: 'Paracetamol 500mg' }).run();
    const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, 'sp-1')).all();
    if (!lo) throw new Error('trigger lô ngầm định không chạy');
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId, loId: lo.id, loai: 'BAN', soLuong: -4, thoiGian: '2026-09-25T08:00:00.000Z' },
    ]);

    const res = await taoRouter().request('/canh-bao-lech-kho');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      canhBao: [
        { loId: lo.id, chiNhanhId, sanPhamId: 'sp-1', maHang: 'SP001', tenSanPham: 'Paracetamol 500mg', soLo: null, hsd: null, ton: -4 },
      ],
    });
  });
});
