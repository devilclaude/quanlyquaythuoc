import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import ExcelJS from 'exceljs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { caiDat, chiNhanh, donViTinh, loHang, phieuNhap, phieuNhapDong, sanPham, theKho, tonKhoLo } from '../db/schema';
import { CAC_TIEU_DE_MAU_EXCEL, nhapHangTuFileExcel, taoMauExcelNhapHang } from './nhap-tu-excel';

type DbTest = ReturnType<typeof drizzle>;

let sqlite: Database.Database;
let db: DbTest;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
  db.insert(chiNhanh).values({ id: 'cn-1', ten: 'Quầy chính' }).run();
});

afterEach(() => {
  sqlite.close();
});

function taoSanPham(id: string, maHang: string, quanLyLoGhiDe?: 'BAT' | 'TAT') {
  db.insert(sanPham)
    .values({ id, maHang, ten: 'Paracetamol 500mg', quanLyLoGhiDe: quanLyLoGhiDe ?? null })
    .run();
  const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, id)).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  return lo.id;
}

function themDonVi(id: string, sanPhamId: string, ten: string, heSo: number, laCoSo = false) {
  db.insert(donViTinh)
    .values({ id, sanPhamId, ten, heSo, laCoSo, giaBan: heSo * 1000 })
    .run();
}

function batQuanLyLoToanCuc() {
  db.update(caiDat).set({ quanLyLo: true }).where(eq(caiDat.id, 1)).run();
}

function tonDem(loId: string): number {
  const [row] = db.select().from(tonKhoLo).where(eq(tonKhoLo.loId, loId)).all();
  return row?.ton ?? 0;
}

/** Dựng buffer .xlsx với đúng tiêu đề mẫu + các dòng dữ liệu truyền vào (mảng ô theo cột). */
async function dungFileExcel(cacDong: (string | number)[][]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Nhập hàng');
  sheet.addRow(CAC_TIEU_DE_MAU_EXCEL);
  for (const dong of cacDong) sheet.addRow(dong);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

async function dungFileExcelTieuDeSai(): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Nhập hàng');
  sheet.addRow(['Cột lạ 1', 'Cột lạ 2']);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

describe('taoMauExcelNhapHang', () => {
  it('sinh file có đúng dòng tiêu đề để người dùng điền theo', async () => {
    const buf = await taoMauExcelNhapHang();

    const wb = new ExcelJS.Workbook();
    // Ép kiểu chữ ký hàm tại ranh giới gọi exceljs — xem chú thích trong nhap-tu-excel.ts.
    const load = wb.xlsx.load.bind(wb.xlsx) as unknown as (duLieu: Uint8Array) => Promise<unknown>;
    await load(buf);
    const sheet = wb.worksheets[0];
    if (!sheet) throw new Error('file mẫu không có sheet nào');
    const tieuDe = (sheet.getRow(1).values as unknown[]).slice(1);
    expect(tieuDe).toEqual(CAC_TIEU_DE_MAU_EXCEL);
  });
});

describe('nhapHangTuFileExcel', () => {
  it('file hợp lệ tạo phiếu hoàn thành, quy đổi đơn vị đúng (SPEC.md §3.3: 5 hộp × 180 viên/hộp = 900 viên)', async () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');
    themDonVi('dvt-1', 'sp-1', 'viên', 1, true);
    themDonVi('dvt-2', 'sp-1', 'hộp', 180);

    const file = await dungFileExcel([['SP001', 'hộp', 5, 260_000, '', '']]);
    const ketQua = await nhapHangTuFileExcel(db, file, 'cn-1', '2026-09-27T07:00:00.000Z');

    expect(ketQua.thanhCong).toBe(true);
    if (!ketQua.thanhCong) throw new Error('mong đợi thành công');
    expect(ketQua.phieu.trangThai).toBe('HOAN_THANH');
    expect(tonDem(loMacDinh)).toBe(900);
  });

  it('mã hàng không tồn tại → báo lỗi đúng số dòng, không ghi kho', async () => {
    const file = await dungFileExcel([['SP_KHONG_TON_TAI', 'viên', 10, 1_000, '', '']]);

    const ketQua = await nhapHangTuFileExcel(db, file, 'cn-1', '2026-09-27T07:00:00.000Z');

    expect(ketQua.thanhCong).toBe(false);
    if (ketQua.thanhCong) throw new Error('mong đợi thất bại');
    expect(ketQua.loi).toHaveLength(1);
    expect(ketQua.loi[0]?.dong).toBe(1);
    expect(ketQua.loi[0]?.thongDiep).toContain('SP_KHONG_TON_TAI');
    expect(db.select().from(theKho).all()).toHaveLength(0);
    expect(db.select().from(phieuNhap).all()).toHaveLength(0);
  });

  it('một dòng lỗi thì cả file bị từ chối — dòng hợp lệ khác trong CÙNG file cũng không được ghi', async () => {
    taoSanPham('sp-1', 'SP001');
    themDonVi('dvt-1', 'sp-1', 'viên', 1, true);

    const file = await dungFileExcel([
      ['SP001', 'viên', 10, 1_000, '', ''],
      ['SP_KHONG_TON_TAI', 'viên', 5, 500, '', ''],
    ]);

    const ketQua = await nhapHangTuFileExcel(db, file, 'cn-1', '2026-09-27T07:00:00.000Z');

    expect(ketQua.thanhCong).toBe(false);
    expect(db.select().from(theKho).all()).toHaveLength(0);
    expect(db.select().from(phieuNhapDong).all()).toHaveLength(0);
  });

  it('số lượng 0 bị từ chối', async () => {
    taoSanPham('sp-1', 'SP001');
    themDonVi('dvt-1', 'sp-1', 'viên', 1, true);

    const file = await dungFileExcel([['SP001', 'viên', 0, 1_000, '', '']]);
    const ketQua = await nhapHangTuFileExcel(db, file, 'cn-1', '2026-09-27T07:00:00.000Z');

    expect(ketQua.thanhCong).toBe(false);
    if (ketQua.thanhCong) throw new Error('mong đợi thất bại');
    expect(ketQua.loi[0]?.thongDiep).toMatch(/số lượng/i);
  });

  it('sản phẩm bật quản lý theo lô mà thiếu số lô/hạn dùng bị từ chối', async () => {
    batQuanLyLoToanCuc();
    taoSanPham('sp-1', 'SP001');
    themDonVi('dvt-1', 'sp-1', 'viên', 1, true);

    const file = await dungFileExcel([['SP001', 'viên', 10, 1_000, '', '']]);
    const ketQua = await nhapHangTuFileExcel(db, file, 'cn-1', '2026-09-27T07:00:00.000Z');

    expect(ketQua.thanhCong).toBe(false);
    if (ketQua.thanhCong) throw new Error('mong đợi thất bại');
    expect(ketQua.loi[0]?.thongDiep).toMatch(/lô/i);
  });

  it('chỉ khai một trong hai số lô/hạn dùng bị từ chối', async () => {
    taoSanPham('sp-1', 'SP001');
    themDonVi('dvt-1', 'sp-1', 'viên', 1, true);

    const file = await dungFileExcel([['SP001', 'viên', 10, 1_000, 'L01', '']]);
    const ketQua = await nhapHangTuFileExcel(db, file, 'cn-1', '2026-09-27T07:00:00.000Z');

    expect(ketQua.thanhCong).toBe(false);
  });

  it('hạn dùng sai định dạng bị từ chối', async () => {
    taoSanPham('sp-1', 'SP001');
    themDonVi('dvt-1', 'sp-1', 'viên', 1, true);

    const file = await dungFileExcel([['SP001', 'viên', 10, 1_000, 'L01', '01/2027']]);
    const ketQua = await nhapHangTuFileExcel(db, file, 'cn-1', '2026-09-27T07:00:00.000Z');

    expect(ketQua.thanhCong).toBe(false);
    if (ketQua.thanhCong) throw new Error('mong đợi thất bại');
    expect(ketQua.loi[0]?.thongDiep).toMatch(/hạn dùng/i);
  });

  it('đơn vị không tồn tại cho sản phẩm bị từ chối', async () => {
    taoSanPham('sp-1', 'SP001');
    themDonVi('dvt-1', 'sp-1', 'viên', 1, true);

    const file = await dungFileExcel([['SP001', 'thùng', 10, 1_000, '', '']]);
    const ketQua = await nhapHangTuFileExcel(db, file, 'cn-1', '2026-09-27T07:00:00.000Z');

    expect(ketQua.thanhCong).toBe(false);
    if (ketQua.thanhCong) throw new Error('mong đợi thất bại');
    expect(ketQua.loi[0]?.thongDiep).toMatch(/đơn vị/i);
  });

  it('file không có dòng dữ liệu nào bị từ chối', async () => {
    const file = await dungFileExcel([]);
    const ketQua = await nhapHangTuFileExcel(db, file, 'cn-1', '2026-09-27T07:00:00.000Z');

    expect(ketQua.thanhCong).toBe(false);
  });

  it('file sai tiêu đề cột (không đúng mẫu) bị từ chối', async () => {
    const file = await dungFileExcelTieuDeSai();
    const ketQua = await nhapHangTuFileExcel(db, file, 'cn-1', '2026-09-27T07:00:00.000Z');

    expect(ketQua.thanhCong).toBe(false);
  });
});
