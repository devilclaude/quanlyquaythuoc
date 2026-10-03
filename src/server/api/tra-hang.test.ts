import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, loHang, sanPham } from '../db/schema';
import { ghiTheKho } from '../kho/so-cai';
import { eq } from 'drizzle-orm';
import { taoHoaDonTuGioHang } from '../ban-hang/tao-hoa-don';
import { dangKyTraHangRoutes } from './tra-hang';

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
  dangKyTraHangRoutes(app, db);
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

/** Bán 10 cơ sở, đơn giá 1.000đ, từ lô ngầm định của sp-1 — trả về id dòng hoá đơn. */
function banHangDonGian(): string {
  const loId = taoSanPhamCoLo('sp-1', 'SP001');
  nhapKho(loId, 100);
  taoHoaDonTuGioHang(db, {
    id: 'hd-1',
    chiNhanhId: CHI_NHANH_MAC_DINH_ID,
    thoiGian: '2026-09-21T08:00:00.000Z',
    phuongThucThanhToan: 'TIEN_MAT',
    dong: [{ id: 'hdd-1', sanPhamId: 'sp-1', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 10 }],
  });
  return 'hdd-1';
}

function guiTaoTraHang(body: unknown) {
  return taoRouter().request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('dangKyTraHangRoutes', () => {
  it('POST / tạo phiếu trả hàng thành công, hoàn đúng tiền', async () => {
    const hoaDonDongId = banHangDonGian();

    const res = await guiTaoTraHang({ hoaDonId: 'hd-1', dong: [{ hoaDonDongId, soLuong: 4 }] });

    expect(res.status).toBe(201);
    const json = (await res.json()) as { ma: string; tongTienHoan: number };
    expect(json.ma).toBe('TH000001');
    expect(json.tongTienHoan).toBe(4_000);
  });

  it('POST / trả về 400 khi thiếu hoaDonId', async () => {
    const hoaDonDongId = banHangDonGian();

    const res = await guiTaoTraHang({ dong: [{ hoaDonDongId, soLuong: 1 }] });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 400 khi danh sách dòng rỗng', async () => {
    banHangDonGian();

    const res = await guiTaoTraHang({ hoaDonId: 'hd-1', dong: [] });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 400 khi số lượng dòng không nguyên dương', async () => {
    const hoaDonDongId = banHangDonGian();

    const res = await guiTaoTraHang({ hoaDonId: 'hd-1', dong: [{ hoaDonDongId, soLuong: 0 }] });

    expect(res.status).toBe(400);
  });

  it('POST / trả về 404 khi hoá đơn gốc không tồn tại', async () => {
    const res = await guiTaoTraHang({
      hoaDonId: 'hd-khong-ton-tai',
      dong: [{ hoaDonDongId: 'hdd-1', soLuong: 1 }],
    });

    expect(res.status).toBe(404);
  });

  it('POST / trả về 404 khi dòng hoá đơn không thuộc hoá đơn đã khai', async () => {
    const hoaDonDongId = banHangDonGian();
    const loId2 = taoSanPhamCoLo('sp-2', 'SP002');
    nhapKho(loId2, 50);
    taoHoaDonTuGioHang(db, {
      id: 'hd-2',
      chiNhanhId: CHI_NHANH_MAC_DINH_ID,
      thoiGian: '2026-09-21T08:05:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [{ id: 'hdd-2', sanPhamId: 'sp-2', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 1 }],
    });

    const res = await guiTaoTraHang({ hoaDonId: 'hd-2', dong: [{ hoaDonDongId, soLuong: 1 }] });

    expect(res.status).toBe(404);
  });

  it('POST / trả về 409 khi số lượng trả vượt số đã bán (cộng dồn các lần trả trước)', async () => {
    const hoaDonDongId = banHangDonGian();
    await guiTaoTraHang({ hoaDonId: 'hd-1', dong: [{ hoaDonDongId, soLuong: 6 }] });

    const res = await guiTaoTraHang({ hoaDonId: 'hd-1', dong: [{ hoaDonDongId, soLuong: 5 }] });

    expect(res.status).toBe(409);
  });

  it('GET / trả về danh sách kèm liên kết ngược mã hoá đơn gốc', async () => {
    const hoaDonDongId = banHangDonGian();
    await guiTaoTraHang({ hoaDonId: 'hd-1', dong: [{ hoaDonDongId, soLuong: 4 }] });

    const res = await taoRouter().request('/');

    expect(res.status).toBe(200);
    const json = (await res.json()) as { duLieu: { ma: string; hoaDonMa: string }[] };
    expect(json.duLieu).toHaveLength(1);
    expect(json.duLieu[0]?.ma).toBe('TH000001');
    expect(json.duLieu[0]?.hoaDonMa).toBe('HD000001');
  });

  it('GET /:id trả về chi tiết kèm từng dòng', async () => {
    const hoaDonDongId = banHangDonGian();
    const taoRes = await guiTaoTraHang({ hoaDonId: 'hd-1', dong: [{ hoaDonDongId, soLuong: 4 }] });
    const { id } = (await taoRes.json()) as { id: string };

    const res = await taoRouter().request(`/${id}`);

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ma: string; hoaDonMa: string; dong: { soLuong: number }[] };
    expect(json.ma).toBe('TH000001');
    expect(json.hoaDonMa).toBe('HD000001');
    expect(json.dong).toHaveLength(1);
    expect(json.dong[0]?.soLuong).toBe(4);
  });

  it('GET /:id trả về 404 khi không tìm thấy', async () => {
    const res = await taoRouter().request('/khong-ton-tai');

    expect(res.status).toBe(404);
  });

  it('GET /hoa-don/:ma trả về hoá đơn kèm conLaiToiDa từng dòng, chưa trả lần nào', async () => {
    banHangDonGian();

    const res = await taoRouter().request('/hoa-don/HD000001');

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ma: string; dong: { soLuongDaBan: number; conLaiToiDa: number }[] };
    expect(json.ma).toBe('HD000001');
    expect(json.dong).toHaveLength(1);
    expect(json.dong[0]?.soLuongDaBan).toBe(10);
    expect(json.dong[0]?.conLaiToiDa).toBe(10);
  });

  it('GET /hoa-don/:ma trả về conLaiToiDa đã giảm sau khi trả một phần', async () => {
    const hoaDonDongId = banHangDonGian();
    await guiTaoTraHang({ hoaDonId: 'hd-1', dong: [{ hoaDonDongId, soLuong: 4 }] });

    const res = await taoRouter().request('/hoa-don/HD000001');

    const json = (await res.json()) as { dong: { conLaiToiDa: number }[] };
    expect(json.dong[0]?.conLaiToiDa).toBe(6);
  });

  it('GET /hoa-don/:ma trả về 404 khi không tìm thấy mã hoá đơn', async () => {
    const res = await taoRouter().request('/hoa-don/HD999999');

    expect(res.status).toBe(404);
  });
});
