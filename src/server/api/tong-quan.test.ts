import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CanhBaoCanDateRes } from '../../shared/hop-dong/tong-quan';
import { layChiNhanhMacDinh } from '../db/chi-nhanh';
import { caiDat, loHang, sanPham } from '../db/schema';
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

  it('GET /canh-bao-can-date trả về rỗng khi chưa có lô thật nào', async () => {
    const res = await taoRouter().request('/canh-bao-can-date');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ canhBao: [] });
  });

  it('GET /canh-bao-can-date trả về lô thật còn tồn, HSD trong 90 ngày tới (cài đặt toàn cục đang BẬT)', async () => {
    db.update(caiDat).set({ quanLyLo: true }).where(eq(caiDat.id, 1)).run();
    const chiNhanhId = layChiNhanhMacDinh(db);
    db.insert(sanPham).values({ id: 'sp-2', maHang: 'SP002', ten: 'Amoxicillin 500mg' }).run();
    db.insert(loHang).values({ id: 'lo-2', sanPhamId: 'sp-2', soLo: 'L01', hsd: '2026-10-15' }).run();
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId, loId: 'lo-2', loai: 'NHAP', soLuong: 10, thoiGian: '2026-09-25T07:00:00.000Z' },
    ]);

    const res = await taoRouter().request('/canh-bao-can-date');

    expect(res.status).toBe(200);
    const than = (await res.json()) as CanhBaoCanDateRes;
    expect(than.canhBao).toHaveLength(1);
    const [dong] = than.canhBao;
    if (!dong) throw new Error('không có cảnh báo');
    expect(dong).toMatchObject({
      loId: 'lo-2',
      chiNhanhId,
      sanPhamId: 'sp-2',
      maHang: 'SP002',
      tenSanPham: 'Amoxicillin 500mg',
      soLo: 'L01',
      hsd: '2026-10-15',
      nguong: 30,
      ton: 10,
    });
    expect(typeof dong.soNgayConLai).toBe('number');
  });

  it('GET /canh-bao-can-date ẨN lô của sản phẩm đã ghi đè TẮT quản lý lô, dù cài đặt toàn cục đang BẬT (SPEC.md §3.2 — "bộ lọc báo cáo cận date")', async () => {
    db.update(caiDat).set({ quanLyLo: true }).where(eq(caiDat.id, 1)).run();
    const chiNhanhId = layChiNhanhMacDinh(db);
    db.insert(sanPham).values({ id: 'sp-3', maHang: 'SP003', ten: 'Vitamin C 500mg', quanLyLoGhiDe: 'TAT' }).run();
    db.insert(loHang).values({ id: 'lo-3', sanPhamId: 'sp-3', soLo: 'L01', hsd: '2026-10-15' }).run();
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId, loId: 'lo-3', loai: 'NHAP', soLuong: 10, thoiGian: '2026-09-25T07:00:00.000Z' },
    ]);

    const res = await taoRouter().request('/canh-bao-can-date');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ canhBao: [] });
  });

  it('GET /canh-bao-can-date vẫn hiện lô của sản phẩm ghi đè BẬT, dù cài đặt toàn cục đang TẮT', async () => {
    db.update(caiDat).set({ quanLyLo: false }).where(eq(caiDat.id, 1)).run();
    const chiNhanhId = layChiNhanhMacDinh(db);
    db.insert(sanPham).values({ id: 'sp-4', maHang: 'SP004', ten: 'Cefixim 200mg', quanLyLoGhiDe: 'BAT' }).run();
    db.insert(loHang).values({ id: 'lo-4', sanPhamId: 'sp-4', soLo: 'L01', hsd: '2026-10-15' }).run();
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId, loId: 'lo-4', loai: 'NHAP', soLuong: 10, thoiGian: '2026-09-25T07:00:00.000Z' },
    ]);

    const res = await taoRouter().request('/canh-bao-can-date');

    expect(res.status).toBe(200);
    const than = (await res.json()) as CanhBaoCanDateRes;
    expect(than.canhBao.map((c) => c.sanPhamId)).toEqual(['sp-4']);
  });
});
