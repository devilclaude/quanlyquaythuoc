import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, hoaDon, loHang, sanPham, tonKhoLo } from '../db/schema';
import { ghiTheKho } from '../kho/so-cai';
import { dangKyHoaDonRoutes } from './hoa-don';

type DbTest = ReturnType<typeof drizzle>;

const CHI_NHANH_MAC_DINH_ID = 'chi-nhanh-mac-dinh';

let sqlite: Database.Database;
let db: DbTest;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
  db.insert(chiNhanh).values({ id: CHI_NHANH_MAC_DINH_ID, ten: 'Quầy chính' }).run();
});

afterEach(() => {
  sqlite.close();
});

function taoRouter() {
  const app = new Hono();
  dangKyHoaDonRoutes(app, db);
  return app;
}

function taoSanPhamCoLo(sanPhamId: string, maHang: string) {
  db.insert(sanPham).values({ id: sanPhamId, maHang, ten: 'Paracetamol 500mg' }).run();
  const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  return lo.id;
}

function nhapKho(loId: string, soLuong: number) {
  ghiTheKho(db, [
    {
      id: `nhap-${loId}`,
      chiNhanhId: CHI_NHANH_MAC_DINH_ID,
      loId,
      loai: 'NHAP',
      soLuong,
      thoiGian: '2026-09-20T07:00:00.000Z',
    },
  ]);
}

function tonDem(loId: string): number {
  const [row] = db
    .select()
    .from(tonKhoLo)
    .where(eq(tonKhoLo.loId, loId))
    .all();
  return row?.ton ?? 0;
}

function guiTaoHoaDon(body: unknown) {
  return taoRouter().request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const dongMau = { sanPhamId: 'sp-1', donViTen: 'Vỉ', heSo: 12, donGia: 17_000, soLuong: 3 };

describe('dangKyHoaDonRoutes', () => {
  it('POST / tạo hoá đơn thành công, trừ đúng kho theo FEFO (SPEC.md §3.3: 3 vỉ hệ số 12 → 36 viên)', async () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 100);

    const res = await guiTaoHoaDon({ phuongThucThanhToan: 'TIEN_MAT', dong: [dongMau] });

    expect(res.status).toBe(201);
    const json = (await res.json()) as { ma: string; khachCanTra: number };
    expect(json.ma).toBe('HD000001');
    expect(json.khachCanTra).toBe(51_000);
    expect(tonDem(loId)).toBe(64);
  });

  it('POST / trả về 400 khi thiếu phương thức thanh toán', async () => {
    const res = await guiTaoHoaDon({ dong: [dongMau] });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 400 khi giỏ hàng rỗng', async () => {
    const res = await guiTaoHoaDon({ phuongThucThanhToan: 'TIEN_MAT', dong: [] });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 400 khi số lượng dòng bằng 0', async () => {
    const res = await guiTaoHoaDon({
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [{ ...dongMau, soLuong: 0 }],
    });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 409 khi tồn không đủ, không tạo hoá đơn "một nửa"', async () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 1);

    const res = await guiTaoHoaDon({
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [{ ...dongMau, heSo: 1, soLuong: 2 }],
    });

    expect(res.status).toBe(409);
    expect(tonDem(loId)).toBe(1);
    expect(db.select().from(hoaDon).all()).toHaveLength(0);
  });

  it('POST / trả về 409 khi giảm giá vượt tổng tiền hàng, không tạo hoá đơn', async () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 100);

    const res = await guiTaoHoaDon({
      phuongThucThanhToan: 'TIEN_MAT',
      giamGia: 999_999,
      dong: [dongMau],
    });

    expect(res.status).toBe(409);
    expect(tonDem(loId)).toBe(100);
    expect(db.select().from(hoaDon).all()).toHaveLength(0);
  });

  it('hai hoá đơn liên tiếp cùng bán hộp cuối khi online → hoá đơn thứ hai bị từ chối (SPEC.md §5.4)', async () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 1);
    const donCuoi = { ...dongMau, heSo: 1, soLuong: 1 };

    const res1 = await guiTaoHoaDon({ phuongThucThanhToan: 'TIEN_MAT', dong: [donCuoi] });
    const res2 = await guiTaoHoaDon({ phuongThucThanhToan: 'TIEN_MAT', dong: [donCuoi] });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(409);
    expect(tonDem(loId)).toBe(0);
    expect(db.select().from(hoaDon).all()).toHaveLength(1);
  });

  it('hai hoá đơn liên tiếp sinh mã tự động tăng dần', async () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 100);

    const res1 = await guiTaoHoaDon({ phuongThucThanhToan: 'TIEN_MAT', dong: [dongMau] });
    const res2 = await guiTaoHoaDon({ phuongThucThanhToan: 'TIEN_MAT', dong: [dongMau] });

    const json1 = (await res1.json()) as { ma: string };
    const json2 = (await res2.json()) as { ma: string };
    expect(json1.ma).toBe('HD000001');
    expect(json2.ma).toBe('HD000002');
  });
});
