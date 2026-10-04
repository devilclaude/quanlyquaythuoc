import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, sanPham } from '../db/schema';
import { taoPhieuNhap } from '../nhap-hang/tao-phieu-nhap';
import { dangKyTraHangNhapRoutes } from './tra-hang-nhap';

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
  db.insert(sanPham).values({ id: 'sp-1', maHang: 'SP001', ten: 'Paracetamol 500mg' }).run();
  db.insert(sanPham).values({ id: 'sp-2', maHang: 'SP002', ten: 'Vitamin C' }).run();
});

afterEach(() => {
  sqlite.close();
});

function taoRouter() {
  const app = new Hono();
  dangKyTraHangNhapRoutes(app, db);
  return app;
}

/** Nhập và hoàn thành ngay một phiếu một dòng (100 cơ sở, 1.000đ/đơn vị) — trả về id phiếu + id dòng. */
function nhapHoanThanhDonGian(): { phieuId: string; dongId: string } {
  taoPhieuNhap(db, {
    id: 'pn-1',
    chiNhanhId: CHI_NHANH_MAC_DINH_ID,
    thoiGian: '2026-09-20T07:00:00.000Z',
    hoanThanhNgay: true,
    dong: [{ id: 'pnd-1', sanPhamId: 'sp-1', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 100, soLo: null, hsd: null }],
  });
  return { phieuId: 'pn-1', dongId: 'pnd-1' };
}

function guiTaoTraHangNhap(body: unknown) {
  return taoRouter().request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('dangKyTraHangNhapRoutes', () => {
  it('POST / tạo phiếu trả hàng nhập thành công, hoàn đúng tiền', async () => {
    const { phieuId, dongId } = nhapHoanThanhDonGian();

    const res = await guiTaoTraHangNhap({ phieuNhapId: phieuId, dong: [{ phieuNhapDongId: dongId, soLuong: 20 }] });

    expect(res.status).toBe(201);
    const json = (await res.json()) as { ma: string; tongTienHoan: number };
    expect(json.ma).toBe('THN000001');
    expect(json.tongTienHoan).toBe(20_000);
  });

  it('POST / trả về 400 khi thiếu phieuNhapId', async () => {
    const { dongId } = nhapHoanThanhDonGian();

    const res = await guiTaoTraHangNhap({ dong: [{ phieuNhapDongId: dongId, soLuong: 1 }] });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 400 khi danh sách dòng rỗng', async () => {
    const { phieuId } = nhapHoanThanhDonGian();

    const res = await guiTaoTraHangNhap({ phieuNhapId: phieuId, dong: [] });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 400 khi số lượng dòng không nguyên dương', async () => {
    const { phieuId, dongId } = nhapHoanThanhDonGian();

    const res = await guiTaoTraHangNhap({ phieuNhapId: phieuId, dong: [{ phieuNhapDongId: dongId, soLuong: 0 }] });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 404 khi phiếu nhập gốc không tồn tại', async () => {
    const res = await guiTaoTraHangNhap({
      phieuNhapId: 'pn-khong-ton-tai',
      dong: [{ phieuNhapDongId: 'pnd-1', soLuong: 1 }],
    });

    expect(res.status).toBe(404);
  });

  it('POST / trả về 404 khi dòng phiếu nhập không thuộc phiếu đã khai', async () => {
    const { dongId } = nhapHoanThanhDonGian();
    taoPhieuNhap(db, {
      id: 'pn-2',
      chiNhanhId: CHI_NHANH_MAC_DINH_ID,
      thoiGian: '2026-09-20T07:05:00.000Z',
      hoanThanhNgay: true,
      dong: [{ id: 'pnd-2', sanPhamId: 'sp-2', donViTen: 'Viên', heSo: 1, donGia: 500, soLuong: 50, soLo: null, hsd: null }],
    });

    const res = await guiTaoTraHangNhap({ phieuNhapId: 'pn-2', dong: [{ phieuNhapDongId: dongId, soLuong: 1 }] });

    expect(res.status).toBe(404);
  });

  it('POST / trả về 409 khi phiếu nhập gốc chưa hoàn thành', async () => {
    taoPhieuNhap(db, {
      id: 'pn-tam',
      chiNhanhId: CHI_NHANH_MAC_DINH_ID,
      thoiGian: '2026-09-20T07:00:00.000Z',
      dong: [{ id: 'pnd-tam', sanPhamId: 'sp-1', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 50, soLo: null, hsd: null }],
    });

    const res = await guiTaoTraHangNhap({ phieuNhapId: 'pn-tam', dong: [{ phieuNhapDongId: 'pnd-tam', soLuong: 1 }] });

    expect(res.status).toBe(409);
  });

  it('POST / trả về 409 khi số lượng trả vượt số đã nhập (cộng dồn các lần trả trước)', async () => {
    const { phieuId, dongId } = nhapHoanThanhDonGian();
    await guiTaoTraHangNhap({ phieuNhapId: phieuId, dong: [{ phieuNhapDongId: dongId, soLuong: 60 }] });

    const res = await guiTaoTraHangNhap({ phieuNhapId: phieuId, dong: [{ phieuNhapDongId: dongId, soLuong: 50 }] });

    expect(res.status).toBe(409);
  });

  it('GET / trả về danh sách kèm liên kết ngược mã phiếu nhập gốc', async () => {
    const { phieuId, dongId } = nhapHoanThanhDonGian();
    await guiTaoTraHangNhap({ phieuNhapId: phieuId, dong: [{ phieuNhapDongId: dongId, soLuong: 20 }] });

    const res = await taoRouter().request('/');

    expect(res.status).toBe(200);
    const json = (await res.json()) as { duLieu: { ma: string; phieuNhapMa: string }[] };
    expect(json.duLieu).toHaveLength(1);
    expect(json.duLieu[0]?.ma).toBe('THN000001');
    expect(json.duLieu[0]?.phieuNhapMa).toBe('PN000001');
  });

  it('GET /:id trả về chi tiết kèm từng dòng', async () => {
    const { phieuId, dongId } = nhapHoanThanhDonGian();
    const taoRes = await guiTaoTraHangNhap({ phieuNhapId: phieuId, dong: [{ phieuNhapDongId: dongId, soLuong: 20 }] });
    const { id } = (await taoRes.json()) as { id: string };

    const res = await taoRouter().request(`/${id}`);

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ma: string; phieuNhapMa: string; dong: { soLuong: number }[] };
    expect(json.ma).toBe('THN000001');
    expect(json.phieuNhapMa).toBe('PN000001');
    expect(json.dong).toHaveLength(1);
    expect(json.dong[0]?.soLuong).toBe(20);
  });

  it('GET /:id trả về 404 khi không tìm thấy', async () => {
    const res = await taoRouter().request('/khong-ton-tai');

    expect(res.status).toBe(404);
  });
});
