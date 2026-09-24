import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, loHang, sanPham } from '../db/schema';
import { ghiTheKho } from '../kho/so-cai';
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

  it('PUT /quan-ly-lo trả 409 kèm lý do khi tắt bị chặn (sản phẩm kế thừa còn >1 lô tồn > 0) — không đổi toàn cục', async () => {
    await guiDoiToanCuc({ bat: true });

    db.insert(sanPham).values({ id: 'sp-1', maHang: 'SP001', ten: 'Paracetamol 500mg' }).run();
    db.insert(loHang).values({ id: 'lo-2', sanPhamId: 'sp-1', soLo: 'L001', hsd: '2027-01-01' }).run();
    const [loNgamDinh] = db.select().from(loHang).where(eq(loHang.sanPhamId, 'sp-1')).all();
    if (!loNgamDinh) throw new Error('trigger lô ngầm định không chạy');
    ghiTheKho(db, [
      {
        id: 'tk-1',
        chiNhanhId: 'chi-nhanh-mac-dinh',
        loId: loNgamDinh.id,
        loai: 'NHAP',
        soLuong: 5,
        thoiGian: '2026-09-23T00:00:00.000Z',
      },
      {
        id: 'tk-2',
        chiNhanhId: 'chi-nhanh-mac-dinh',
        loId: 'lo-2',
        loai: 'NHAP',
        soLuong: 5,
        thoiGian: '2026-09-23T00:00:00.000Z',
      },
    ]);

    const res = await guiDoiToanCuc({ bat: false });

    expect(res.status).toBe(409);
    const json = (await res.json()) as { loi: string };
    expect(json.loi).toMatch(/sp-1/);

    const resSau = await taoRouter().request('/quan-ly-lo');
    await expect(resSau.json()).resolves.toEqual({ bat: true });
  });
});
