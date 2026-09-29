import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { layChiNhanhMacDinh } from '../db/chi-nhanh';
import { hoaDon, loHang, sanPham, tonKhoLo } from '../db/schema';
import { ghiTheKho } from '../kho/so-cai';
import { dangKyDongBoRoutes } from './dong-bo';

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

function taoRouter() {
  const app = new Hono();
  dangKyDongBoRoutes(app, db);
  return app;
}

function taoSanPhamCoLo(sanPhamId: string, maHang: string): string {
  db.insert(sanPham).values({ id: sanPhamId, maHang, ten: 'Paracetamol 500mg' }).run();
  const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  return lo.id;
}

function nhapKho(loId: string, chiNhanhId: string, soLuong: number, thoiGian: string) {
  ghiTheKho(db, [{ id: `nhap-${loId}`, chiNhanhId, loId, loai: 'NHAP', soLuong, thoiGian }]);
}

function tonDem(loId: string): number {
  const [row] = db.select().from(tonKhoLo).where(eq(tonKhoLo.loId, loId)).all();
  return row?.ton ?? 0;
}

function guiDongBo(body: unknown) {
  return taoRouter().request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const dongMau = { sanPhamId: 'sp-1', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 3 };
const thaoTacMau = {
  loai: 'BAN_HANG' as const,
  id: 'tt-1',
  maHoaDon: 'HDABC123-000001',
  thoiGian: '2026-09-25T08:00:00.000Z',
  phuongThucThanhToan: 'TIEN_MAT' as const,
  dong: [dongMau],
};

describe('dangKyDongBoRoutes', () => {
  it('POST / áp dụng thao tác hợp lệ, trả DA_AP_DUNG, ghi đúng hoá đơn và trừ kho', async () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, layChiNhanhMacDinh(db), 100, '2026-09-24T07:00:00.000Z');

    const res = await guiDongBo({ thaoTac: [thaoTacMau] });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ketQua: [{ id: 'tt-1', ketQua: 'DA_AP_DUNG' }] });
    expect(tonDem(loId)).toBe(97);
    const [hd] = db.select().from(hoaDon).where(eq(hoaDon.id, 'tt-1')).all();
    expect(hd?.ma).toBe('HDABC123-000001');
  });

  it('gửi lại đúng thao tác lần hai: trả DA_TON_TAI, không tạo hoá đơn thứ hai (idempotent qua HTTP)', async () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, layChiNhanhMacDinh(db), 100, '2026-09-24T07:00:00.000Z');

    await guiDongBo({ thaoTac: [thaoTacMau] });
    const res2 = await guiDongBo({ thaoTac: [thaoTacMau] });

    expect(res2.status).toBe(200);
    expect(await res2.json()).toEqual({ ketQua: [{ id: 'tt-1', ketQua: 'DA_TON_TAI' }] });
    expect(db.select().from(hoaDon).all()).toHaveLength(1);
  });

  it('bán vượt tồn qua đồng bộ không bị từ chối — trả 200 DA_AP_DUNG, không phải 409', async () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, layChiNhanhMacDinh(db), 1, '2026-09-24T07:00:00.000Z');

    const res = await guiDongBo({ thaoTac: [{ ...thaoTacMau, dong: [{ ...dongMau, soLuong: 5 }] }] });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ketQua: [{ id: 'tt-1', ketQua: 'DA_AP_DUNG' }] });
    expect(tonDem(loId)).toBe(-4);
  });

  it('dữ liệu không hợp lệ (thiếu maHoaDon) bị từ chối 400, không ghi gì', async () => {
    taoSanPhamCoLo('sp-1', 'SP001');
    const thieuMa = {
      loai: thaoTacMau.loai,
      id: thaoTacMau.id,
      thoiGian: thaoTacMau.thoiGian,
      phuongThucThanhToan: thaoTacMau.phuongThucThanhToan,
      dong: thaoTacMau.dong,
    };

    const res = await guiDongBo({ thaoTac: [thieuMa] });

    expect(res.status).toBe(400);
    expect(db.select().from(hoaDon).all()).toHaveLength(0);
  });

  it('nhiều thao tác trong một lần gửi: áp dụng đúng thứ tự trong mảng, mỗi thao tác một kết quả', async () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, layChiNhanhMacDinh(db), 100, '2026-09-24T07:00:00.000Z');

    const res = await guiDongBo({
      thaoTac: [thaoTacMau, { ...thaoTacMau, id: 'tt-2', maHoaDon: 'HDABC123-000002' }],
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ketQua: [
        { id: 'tt-1', ketQua: 'DA_AP_DUNG' },
        { id: 'tt-2', ketQua: 'DA_AP_DUNG' },
      ],
    });
    expect(tonDem(loId)).toBe(94);
  });
});
