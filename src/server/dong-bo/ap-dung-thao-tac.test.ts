import Database from 'better-sqlite3';
import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ThaoTacBanHangOffline } from '../../shared/hop-dong/dong-bo';
import { layChiNhanhMacDinh } from '../db/chi-nhanh';
import { hoaDon, loHang, sanPham, theKho, tonKhoLo } from '../db/schema';
import { ghiTheKho } from '../kho/so-cai';
import { apDungLoThaoTac, apDungThaoTacBanHang } from './ap-dung-thao-tac';

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

function taoSanPhamCoLo(sanPhamId: string, maHang: string): string {
  db.insert(sanPham).values({ id: sanPhamId, maHang, ten: 'Paracetamol 500mg' }).run();
  const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  return lo.id;
}

function nhapKho(loId: string, chiNhanhId: string, soLuong: number, thoiGian: string, giaTri = 0) {
  ghiTheKho(db, [{ id: `nhap-${loId}-${thoiGian}`, chiNhanhId, loId, loai: 'NHAP', soLuong, giaTri, thoiGian }]);
}

function tonDem(loId: string): number {
  const [row] = db.select().from(tonKhoLo).where(eq(tonKhoLo.loId, loId)).all();
  return row?.ton ?? 0;
}

function thaoTacMau(overrides: Partial<ThaoTacBanHangOffline> = {}): ThaoTacBanHangOffline {
  return {
    loai: 'BAN_HANG',
    id: overrides.id ?? 'tt-1',
    maHoaDon: overrides.maHoaDon ?? 'HDABC123-000001',
    thoiGian: overrides.thoiGian ?? '2026-09-25T08:00:00.000Z',
    phuongThucThanhToan: overrides.phuongThucThanhToan ?? 'TIEN_MAT',
    dong: overrides.dong ?? [{ sanPhamId: 'sp-1', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 3 }],
    ...(overrides.giamGia !== undefined ? { giamGia: overrides.giamGia } : {}),
    ...(overrides.thuKhac !== undefined ? { thuKhac: overrides.thuKhac } : {}),
  };
}

describe('apDungThaoTacBanHang', () => {
  it('áp dụng một thao tác mới: tạo hoá đơn dùng đúng mã đã cấp tại client, ghi kho, trả DA_AP_DUNG', () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, layChiNhanhMacDinh(db), 100, '2026-09-24T07:00:00.000Z');

    const ketQua = apDungThaoTacBanHang(db, thaoTacMau());

    expect(ketQua).toEqual({ id: 'tt-1', ketQua: 'DA_AP_DUNG' });
    const [hd] = db.select().from(hoaDon).where(eq(hoaDon.id, 'tt-1')).all();
    expect(hd?.ma).toBe('HDABC123-000001');
    expect(tonDem(loId)).toBe(97);
  });

  it('idempotent: gửi lại cùng id hai lần thì lần hai trả DA_TON_TAI, tồn kho không đổi thêm', () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, layChiNhanhMacDinh(db), 100, '2026-09-24T07:00:00.000Z');

    apDungThaoTacBanHang(db, thaoTacMau());
    const tonSauLanDau = tonDem(loId);

    const ketQuaLanHai = apDungThaoTacBanHang(db, thaoTacMau());

    expect(ketQuaLanHai).toEqual({ id: 'tt-1', ketQua: 'DA_TON_TAI' });
    expect(tonDem(loId)).toBe(tonSauLanDau);
    expect(db.select().from(hoaDon).all()).toHaveLength(1);
  });

  it('bán vượt tồn KHÔNG bị từ chối — máy chủ vẫn nhận đơn đã bán và đã in (SPEC.md §4.4)', () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, layChiNhanhMacDinh(db), 2, '2026-09-24T07:00:00.000Z');

    const ketQua = apDungThaoTacBanHang(
      db,
      thaoTacMau({ dong: [{ sanPhamId: 'sp-1', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 5 }] }),
    );

    expect(ketQua).toEqual({ id: 'tt-1', ketQua: 'DA_AP_DUNG' });
    expect(tonDem(loId)).toBe(-3);
  });

  it('lỗi nghiệp vụ thật (giảm giá vượt tổng tiền hàng) trả về LOI kèm thông điệp, không ném ra ngoài', () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, layChiNhanhMacDinh(db), 100, '2026-09-24T07:00:00.000Z');

    const ketQua = apDungThaoTacBanHang(db, thaoTacMau({ giamGia: 999_999 }));

    expect(ketQua.ketQua).toBe('LOI');
    expect(ketQua.loi).toBeTruthy();
    expect(db.select().from(hoaDon).all()).toHaveLength(0);
  });
});

describe('apDungLoThaoTac', () => {
  it('áp dụng theo đúng thứ tự truyền vào (thứ tự đến máy chủ), không theo trường thoiGian của từng thao tác', () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, layChiNhanhMacDinh(db), 100, '2026-09-20T07:00:00.000Z', 1_000_000);

    // "tt-som" có thoiGian SỚM HƠN "tt-muon" nhưng được gửi lên SAU — kiểm tra
    // COGS gấp theo thứ tự áp dụng (đến máy chủ), không hồi tố theo thoiGian.
    const ketQua = apDungLoThaoTac(db, [
      thaoTacMau({
        id: 'tt-muon',
        maHoaDon: 'HDX-000001',
        thoiGian: '2026-09-25T08:00:00.000Z',
        dong: [{ sanPhamId: 'sp-1', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 10 }],
      }),
      thaoTacMau({
        id: 'tt-som',
        maHoaDon: 'HDX-000002',
        thoiGian: '2026-09-19T08:00:00.000Z',
        dong: [{ sanPhamId: 'sp-1', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 20 }],
      }),
    ]);

    expect(ketQua).toEqual([
      { id: 'tt-muon', ketQua: 'DA_AP_DUNG' },
      { id: 'tt-som', ketQua: 'DA_AP_DUNG' },
    ]);

    const dongTheKhoTheoThuTuGhi = db
      .select({ id: theKho.id, soLuong: theKho.soLuong })
      .from(theKho)
      .where(eq(theKho.loai, 'BAN'))
      .orderBy(asc(theKho.thoiGianMayChu), asc(theKho.id))
      .all();

    // Dòng của "tt-muon" (gửi TRƯỚC) phải nằm trước dòng của "tt-som" trong sổ
    // cái theo thứ tự đến máy chủ, dù thoiGian của "tt-som" sớm hơn.
    expect(dongTheKhoTheoThuTuGhi[0]?.soLuong).toBe(-10);
    expect(dongTheKhoTheoThuTuGhi[1]?.soLuong).toBe(-20);
  });

  it('idempotent trên cả lô: gửi lại đúng mảng hai lần thì lần hai toàn bộ trả DA_TON_TAI, tồn không đổi', () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, layChiNhanhMacDinh(db), 100, '2026-09-20T07:00:00.000Z');

    const danhSach = [thaoTacMau({ id: 'tt-1' }), thaoTacMau({ id: 'tt-2', maHoaDon: 'HDABC123-000002' })];
    apDungLoThaoTac(db, danhSach);
    const tonSauLanDau = tonDem(loId);

    const ketQuaLanHai = apDungLoThaoTac(db, danhSach);

    expect(ketQuaLanHai).toEqual([
      { id: 'tt-1', ketQua: 'DA_TON_TAI' },
      { id: 'tt-2', ketQua: 'DA_TON_TAI' },
    ]);
    expect(tonDem(loId)).toBe(tonSauLanDau);
  });
});
