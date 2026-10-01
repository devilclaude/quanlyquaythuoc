import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import ExcelJS from 'exceljs';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CAC_TIEU_DE_MAU_EXCEL } from '../nhap-hang/nhap-tu-excel';
import { chiNhanh, donViTinh, loHang, phieuNhap, sanPham, tonKhoLo } from '../db/schema';
import { dangKyPhieuNhapRoutes } from './phieu-nhap';

/** Dựng buffer .xlsx với đúng tiêu đề mẫu + các dòng dữ liệu truyền vào — dùng chung cho test route Excel. */
async function dungFileExcel(cacDong: (string | number)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Nhập hàng');
  sheet.addRow([...CAC_TIEU_DE_MAU_EXCEL]);
  for (const dong of cacDong) sheet.addRow(dong);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

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

  it('GET / mang theo tongTien đúng tổng (đơn giá × số lượng) các dòng', async () => {
    taoSanPham('sp-1', 'SP001');
    await gui('/', 'POST', { dong: [dongMau] }); // 260.000 × 5 = 1.300.000

    const res = await gui('/', 'GET');

    const json = (await res.json()) as { duLieu: { tongTien: number }[] };
    expect(json.duLieu[0]?.tongTien).toBe(1_300_000);
  });

  it('GET /?tim= lọc theo mã phiếu, khớp một phần (T-041)', async () => {
    taoSanPham('sp-1', 'SP001');
    const resTao1 = await gui('/', 'POST', { dong: [dongMau] });
    const { ma } = (await resTao1.json()) as { ma: string };
    await gui('/', 'POST', { dong: [dongMau] });

    const res = await gui(`/?tim=${ma}`, 'GET');

    const json = (await res.json()) as { duLieu: { ma: string }[] };
    expect(json.duLieu).toHaveLength(1);
    expect(json.duLieu[0]?.ma).toBe(ma);
  });

  it('GET /?trangThai= lọc theo trạng thái, nhận nhiều giá trị lặp lại', async () => {
    taoSanPham('sp-1', 'SP001');
    await gui('/', 'POST', { hoanThanhNgay: true, dong: [dongMau] });
    await gui('/', 'POST', { dong: [dongMau] });

    const resHoanThanh = await gui('/?trangThai=HOAN_THANH', 'GET');
    const jsonHoanThanh = (await resHoanThanh.json()) as { duLieu: { trangThai: string }[] };
    expect(jsonHoanThanh.duLieu).toHaveLength(1);
    expect(jsonHoanThanh.duLieu[0]?.trangThai).toBe('HOAN_THANH');

    const resCaHai = await gui('/?trangThai=HOAN_THANH&trangThai=PHIEU_TAM', 'GET');
    const jsonCaHai = (await resCaHai.json()) as { duLieu: unknown[] };
    expect(jsonCaHai.duLieu).toHaveLength(2);
  });

  it('GET /?trangThai=<giá trị rác> bỏ qua thay vì 500, coi như không lọc', async () => {
    taoSanPham('sp-1', 'SP001');
    await gui('/', 'POST', { dong: [dongMau] });

    const res = await gui('/?trangThai=KHONG_HOP_LE', 'GET');

    expect(res.status).toBe(200);
    const json = (await res.json()) as { duLieu: unknown[] };
    expect(json.duLieu).toHaveLength(1);
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

describe('dangKyPhieuNhapRoutes — nhập từ Excel (T-043)', () => {
  it('GET /mau-excel trả về file .xlsx đúng tiêu đề mẫu', async () => {
    const res = await taoRouter().request('/mau-excel');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('spreadsheetml');
    const buf = new Uint8Array(await res.arrayBuffer());

    const wb = new ExcelJS.Workbook();
    // Ép kiểu chữ ký hàm tại ranh giới gọi exceljs — xem chú thích trong nhap-tu-excel.ts.
    const load = wb.xlsx.load.bind(wb.xlsx) as unknown as (duLieu: Uint8Array) => Promise<unknown>;
    await load(buf);
    const sheet = wb.worksheets[0];
    if (!sheet) throw new Error('file mẫu không có sheet');
    expect((sheet.getRow(1).values as unknown[])[1]).toBe('Mã hàng');
  });

  it('POST /tu-excel với file hợp lệ tạo phiếu hoàn thành, ghi kho đúng', async () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');
    db.insert(donViTinh).values({ id: 'dvt-1', sanPhamId: 'sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 }).run();
    db.insert(donViTinh).values({ id: 'dvt-2', sanPhamId: 'sp-1', ten: 'hộp', heSo: 180, giaBan: 90_000 }).run();

    const file = await dungFileExcel([['SP001', 'hộp', 5, 260_000, '', '']]);
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(file)]), 'nhap-hang.xlsx');

    const res = await taoRouter().request('/tu-excel', { method: 'POST', body: form });

    expect(res.status).toBe(201);
    const json = (await res.json()) as { thanhCong: boolean; phieu: { trangThai: string } };
    expect(json.thanhCong).toBe(true);
    expect(json.phieu.trangThai).toBe('HOAN_THANH');
    expect(tonDem(loMacDinh)).toBe(900);
  });

  it('POST /tu-excel với dòng lỗi trả về 400 kèm danh sách lỗi, không ghi kho', async () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');

    const file = await dungFileExcel([['SP_KHONG_TON_TAI', 'viên', 10, 1_000, '', '']]);
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(file)]), 'nhap-hang.xlsx');

    const res = await taoRouter().request('/tu-excel', { method: 'POST', body: form });

    expect(res.status).toBe(400);
    const json = (await res.json()) as { thanhCong: boolean; loi: unknown[] };
    expect(json.thanhCong).toBe(false);
    expect(json.loi.length).toBeGreaterThan(0);
    expect(tonDem(loMacDinh)).toBe(0);
  });

  it('POST /tu-excel thiếu file trả về 400', async () => {
    const form = new FormData();
    const res = await taoRouter().request('/tu-excel', { method: 'POST', body: form });
    expect(res.status).toBe(400);
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
