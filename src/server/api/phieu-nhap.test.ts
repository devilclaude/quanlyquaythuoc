import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, loHang, phieuNhap, sanPham, tonKhoLo } from '../db/schema';
import { dangKyPhieuNhapRoutes } from './phieu-nhap';

type DbTest = ReturnType<typeof drizzle>;

const CHI_NHANH_MAC_DINH_ID = 'chi-nhanh-mac-dinh';

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
  dangKyPhieuNhapRoutes(app, db);
  return app;
}

function taoSanPham(id: string, maHang: string, quanLyLoGhiDe?: 'BAT' | 'TAT') {
  db.insert(sanPham)
    .values({ id, maHang, ten: 'Paracetamol 500mg', quanLyLoGhiDe: quanLyLoGhiDe ?? null })
    .run();
  const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, id)).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  return lo.id;
}

function tonDem(loId: string): number {
  const [row] = db
    .select()
    .from(tonKhoLo)
    .where(and(eq(tonKhoLo.loId, loId), eq(tonKhoLo.chiNhanhId, CHI_NHANH_MAC_DINH_ID)))
    .all();
  return row?.ton ?? 0;
}

function gui(path: string, method: string, body?: unknown) {
  return taoRouter().request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const dongMau = { sanPhamId: 'sp-1', donViTen: 'hộp', heSo: 180, donGia: 260_000, soLuong: 5 };

describe('dangKyPhieuNhapRoutes', () => {
  it('POST / tạo phiếu tạm thành công, không ghi kho', async () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');

    const res = await gui('/', 'POST', { dong: [dongMau] });

    expect(res.status).toBe(201);
    const json = (await res.json()) as { ma: string; trangThai: string };
    expect(json.ma).toBe('PN000001');
    expect(json.trangThai).toBe('PHIEU_TAM');
    expect(tonDem(loMacDinh)).toBe(0);
  });

  it('POST / với hoanThanhNgay ghi kho ngay (SPEC.md §3.3: 5 hộp hệ số 180 → 900 viên)', async () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');

    const res = await gui('/', 'POST', { hoanThanhNgay: true, dong: [dongMau] });

    expect(res.status).toBe(201);
    const json = (await res.json()) as { trangThai: string };
    expect(json.trangThai).toBe('HOAN_THANH');
    expect(tonDem(loMacDinh)).toBe(900);
  });

  it('POST / trả về 400 khi thiếu dòng', async () => {
    taoSanPham('sp-1', 'SP001');

    const res = await gui('/', 'POST', { dong: [] });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 409 khi thiếu HSD bắt buộc (sản phẩm bật quản lý lô), không tạo phiếu', async () => {
    taoSanPham('sp-1', 'SP001', 'BAT');

    const res = await gui('/', 'POST', { hoanThanhNgay: true, dong: [dongMau] });

    expect(res.status).toBe(409);
    expect(db.select().from(phieuNhap).all()).toHaveLength(0);
  });

  it('GET / trả về danh sách phiếu đã tạo', async () => {
    taoSanPham('sp-1', 'SP001');
    await gui('/', 'POST', { dong: [dongMau] });
    await gui('/', 'POST', { dong: [dongMau] });

    const res = await gui('/', 'GET');

    expect(res.status).toBe(200);
    const json = (await res.json()) as { duLieu: unknown[] };
    expect(json.duLieu).toHaveLength(2);
  });

  it('GET /:id trả về chi tiết đúng, 404 khi không tồn tại', async () => {
    taoSanPham('sp-1', 'SP001');
    const resTao = await gui('/', 'POST', { dong: [dongMau] });
    const { id } = (await resTao.json()) as { id: string };

    const res = await gui(`/${id}`, 'GET');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { dong: { donViTen: string }[] };
    expect(json.dong).toHaveLength(1);
    expect(json.dong[0]?.donViTen).toBe('hộp');

    const res404 = await gui('/khong-ton-tai', 'GET');
    expect(res404.status).toBe(404);
  });

  it('PUT /:id sửa dòng khi còn tạm, trả về chi tiết mới', async () => {
    taoSanPham('sp-1', 'SP001');
    const resTao = await gui('/', 'POST', { dong: [dongMau] });
    const { id } = (await resTao.json()) as { id: string };

    const res = await gui(`/${id}`, 'PUT', { dong: [{ ...dongMau, soLuong: 9 }] });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { dong: { soLuong: number }[] };
    expect(json.dong).toHaveLength(1);
    expect(json.dong[0]?.soLuong).toBe(9);
  });

  it('PUT /:id trả về 404 khi phiếu không tồn tại', async () => {
    const res = await gui('/khong-ton-tai', 'PUT', { dong: [dongMau] });
    expect(res.status).toBe(404);
  });

  it('PUT /:id trả về 409 khi phiếu đã hoàn thành', async () => {
    taoSanPham('sp-1', 'SP001');
    const resTao = await gui('/', 'POST', { hoanThanhNgay: true, dong: [dongMau] });
    const { id } = (await resTao.json()) as { id: string };

    const res = await gui(`/${id}`, 'PUT', { dong: [{ ...dongMau, soLuong: 9 }] });
    expect(res.status).toBe(409);
  });

  it('POST /:id/hoan-thanh hoàn thành phiếu tạm, ghi kho đúng', async () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');
    const resTao = await gui('/', 'POST', { dong: [dongMau] });
    const { id } = (await resTao.json()) as { id: string };

    const res = await gui(`/${id}/hoan-thanh`, 'POST');

    expect(res.status).toBe(200);
    const json = (await res.json()) as { trangThai: string };
    expect(json.trangThai).toBe('HOAN_THANH');
    expect(tonDem(loMacDinh)).toBe(900);
  });

  it('POST /:id/hoan-thanh trả về 404 khi không tồn tại', async () => {
    const res = await gui('/khong-ton-tai/hoan-thanh', 'POST');
    expect(res.status).toBe(404);
  });

  it('POST /:id/hoan-thanh trả về 409 khi đã hoàn thành — idempotent, không ghi kho lần hai', async () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');
    const resTao = await gui('/', 'POST', { hoanThanhNgay: true, dong: [dongMau] });
    const { id } = (await resTao.json()) as { id: string };

    const res = await gui(`/${id}/hoan-thanh`, 'POST');

    expect(res.status).toBe(409);
    expect(tonDem(loMacDinh)).toBe(900);
  });
});

// Sanity: đảm bảo test file này thật sự dùng chung chi nhánh mặc định do route
// tự get-or-create (layChiNhanhMacDinh), không phải test tự chèn.
describe('layChiNhanhMacDinh qua route', () => {
  it('chi nhánh mặc định được tạo tự động khi tạo phiếu đầu tiên', async () => {
    taoSanPham('sp-1', 'SP001');
    await gui('/', 'POST', { dong: [dongMau] });

    const [cn] = db.select().from(chiNhanh).where(eq(chiNhanh.id, CHI_NHANH_MAC_DINH_ID)).all();
    expect(cn).toBeDefined();
  });
});
