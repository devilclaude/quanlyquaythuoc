import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, loHang, sanPham, theKho, tonKhoLo, traHang, traHangDong, traHangDongLo } from '../db/schema';
import { taoHoaDonTuGioHang, type DongGioHang } from '../ban-hang/tao-hoa-don';
import { ghiTheKho } from '../kho/so-cai';
import {
  DongTraHangRongError,
  HoaDonDongKhongThuocHoaDonError,
  HoaDonKhongTonTaiError,
  SoLuongKhongHopLeError,
  VuotSoLuongDaBanError,
  layChiTietTraHang,
  layDanhSachTraHang,
  taoPhieuTraHang,
} from './tao-phieu-tra-hang';

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

function taoChiNhanh(id: string) {
  db.insert(chiNhanh).values({ id, ten: 'Quầy chính' }).run();
}

function taoSanPhamCoLo(sanPhamId: string, maHang: string) {
  db.insert(sanPham).values({ id: sanPhamId, maHang, ten: 'Paracetamol 500mg' }).run();
  const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  return lo.id;
}

function taoLoThat(id: string, sanPhamId: string, soLo: string, hsd: string) {
  db.insert(loHang).values({ id, sanPhamId, soLo, hsd }).run();
}

function nhapKho(loId: string, chiNhanhId: string, soLuong: number, thoiGian: string, giaTri = 0) {
  ghiTheKho(db, [{ id: `nhap-${loId}-${thoiGian}`, chiNhanhId, loId, loai: 'NHAP', soLuong, giaTri, thoiGian }]);
}

function tonDem(loId: string, chiNhanhId: string): number {
  const [row] = db
    .select()
    .from(tonKhoLo)
    .where(and(eq(tonKhoLo.loId, loId), eq(tonKhoLo.chiNhanhId, chiNhanhId)))
    .all();
  return row?.ton ?? 0;
}

function moiDong(overrides: Partial<DongGioHang> = {}): DongGioHang {
  return {
    id: overrides.id ?? 'hdd-1',
    sanPhamId: overrides.sanPhamId ?? 'sp-1',
    donViTen: overrides.donViTen ?? 'Viên',
    heSo: overrides.heSo ?? 1,
    donGia: overrides.donGia ?? 1_000,
    soLuong: overrides.soLuong ?? 10,
    ...(overrides.loUuTienThuCong !== undefined ? { loUuTienThuCong: overrides.loUuTienThuCong } : {}),
  };
}

/** Bán 10 cơ sở đơn giá 1.000đ (không giảm giá) từ lô ngầm định của sp-1, trả về loId. */
function banHangDonGian(chiNhanhId: string): { loId: string; hoaDonDongId: string } {
  const loId = taoSanPhamCoLo('sp-1', 'SP001');
  nhapKho(loId, chiNhanhId, 100, '2026-09-20T07:00:00.000Z');
  taoHoaDonTuGioHang(db, {
    id: 'hd-1',
    chiNhanhId,
    thoiGian: '2026-09-21T08:00:00.000Z',
    phuongThucThanhToan: 'TIEN_MAT',
    dong: [moiDong({ id: 'hdd-1', soLuong: 10 })],
  });
  return { loId, hoaDonDongId: 'hdd-1' };
}

describe('taoPhieuTraHang', () => {
  it('trả một phần một dòng: hoàn đúng số lượng vào kho và tính đúng tiền hoàn theo tỷ lệ', () => {
    taoChiNhanh('cn-1');
    const { loId, hoaDonDongId } = banHangDonGian('cn-1');
    expect(tonDem(loId, 'cn-1')).toBe(90);

    const ketQua = taoPhieuTraHang(db, {
      id: 'th-1',
      hoaDonId: 'hd-1',
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thd-1', hoaDonDongId, soLuong: 4 }],
    });

    expect(ketQua.ma).toBe('TH000001');
    expect(ketQua.tongTienHoan).toBe(4_000);
    expect(tonDem(loId, 'cn-1')).toBe(94);

    const dongTraHang = db.select().from(traHangDong).where(eq(traHangDong.id, 'thd-1')).all();
    expect(dongTraHang[0]?.soLuong).toBe(4);
    expect(dongTraHang[0]?.tienHoan).toBe(4_000);

    const dongTheKhoTraHang = db.select().from(theKho).where(eq(theKho.loai, 'TRA_HANG')).all();
    expect(dongTheKhoTraHang).toHaveLength(1);
    expect(dongTheKhoTraHang[0]?.soLuong).toBe(4);
    expect(dongTheKhoTraHang[0]?.loId).toBe(loId);
  });

  it('trả đủ số đã bán: hoàn lại đúng toàn bộ tiền và tồn về như trước khi bán', () => {
    taoChiNhanh('cn-1');
    const { loId, hoaDonDongId } = banHangDonGian('cn-1');

    const ketQua = taoPhieuTraHang(db, {
      id: 'th-1',
      hoaDonId: 'hd-1',
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thd-1', hoaDonDongId, soLuong: 10 }],
    });

    expect(ketQua.tongTienHoan).toBe(10_000);
    expect(tonDem(loId, 'cn-1')).toBe(100);
  });

  it('trả vượt số đã bán bị từ chối, không ghi gì', () => {
    taoChiNhanh('cn-1');
    const { loId, hoaDonDongId } = banHangDonGian('cn-1');

    expect(() =>
      taoPhieuTraHang(db, {
        id: 'th-1',
        hoaDonId: 'hd-1',
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: 'thd-1', hoaDonDongId, soLuong: 11 }],
      }),
    ).toThrow(VuotSoLuongDaBanError);

    expect(tonDem(loId, 'cn-1')).toBe(90);
    expect(db.select().from(traHang).all()).toHaveLength(0);
    expect(db.select().from(traHangDong).all()).toHaveLength(0);
  });

  it('trả hai lần cộng dồn vượt tổng đã bán bị từ chối ở lần thứ hai, lần đầu vẫn giữ nguyên', () => {
    taoChiNhanh('cn-1');
    const { loId, hoaDonDongId } = banHangDonGian('cn-1');

    taoPhieuTraHang(db, {
      id: 'th-1',
      hoaDonId: 'hd-1',
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thd-1', hoaDonDongId, soLuong: 6 }],
    });
    expect(tonDem(loId, 'cn-1')).toBe(96);

    expect(() =>
      taoPhieuTraHang(db, {
        id: 'th-2',
        hoaDonId: 'hd-1',
        thoiGian: '2026-09-22T09:00:00.000Z',
        dong: [{ id: 'thd-2', hoaDonDongId, soLuong: 5 }],
      }),
    ).toThrow(VuotSoLuongDaBanError);

    // Lần trả đầu (6) vẫn còn nguyên, lần thứ hai (5, tổng 11 > 10 đã bán) không ghi gì.
    expect(tonDem(loId, 'cn-1')).toBe(96);
    expect(db.select().from(traHang).where(eq(traHang.id, 'th-2')).all()).toHaveLength(0);
  });

  it('hoàn đúng thứ tự LIFO khi dòng gốc đã trừ qua nhiều hơn một lô', () => {
    taoChiNhanh('cn-1');
    const loNgamDinh = taoSanPhamCoLo('sp-1', 'SP001');
    const loThat = 'lo-that-1';
    taoLoThat(loThat, 'sp-1', 'L001', '2027-01-01');
    nhapKho(loNgamDinh, 'cn-1', 5, '2026-09-19T07:00:00.000Z');
    nhapKho(loThat, 'cn-1', 100, '2026-09-20T07:00:00.000Z');

    // FEFO: lô ngầm định (5 viên, thuTu=0) hết trước, tràn 3 viên sang lô thật (thuTu=1).
    taoHoaDonTuGioHang(db, {
      id: 'hd-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:00:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [moiDong({ id: 'hdd-1', soLuong: 8 })],
    });
    expect(tonDem(loNgamDinh, 'cn-1')).toBe(0);
    expect(tonDem(loThat, 'cn-1')).toBe(97);

    // Trả 4: LIFO hoàn lô thật (trừ sau cùng, 3 viên) trước, rồi 1 viên còn lại về lô ngầm định.
    taoPhieuTraHang(db, {
      id: 'th-1',
      hoaDonId: 'hd-1',
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thd-1', hoaDonDongId: 'hdd-1', soLuong: 4 }],
    });

    expect(tonDem(loThat, 'cn-1')).toBe(100);
    expect(tonDem(loNgamDinh, 'cn-1')).toBe(1);

    const cacLoDaHoan = db.select().from(traHangDongLo).where(eq(traHangDongLo.traHangDongId, 'thd-1')).all();
    const theoLo = new Map(cacLoDaHoan.map((d) => [d.loId, d.soLuong]));
    expect(theoLo.get(loThat)).toBe(3);
    expect(theoLo.get(loNgamDinh)).toBe(1);
  });

  it('chạy cùng kịch bản bán + trả ở chế độ phẳng (lô ngầm định) và có lô thật cho cùng số dư cuối (SPEC.md §9 bất biến 6)', () => {
    taoChiNhanh('cn-1');
    const loPhang = taoSanPhamCoLo('sp-phang', 'SPPHANG');
    const loThatSp = taoSanPhamCoLo('sp-lo', 'SPLO');
    const loThat = 'lo-that-1';
    taoLoThat(loThat, 'sp-lo', 'L001', '2027-01-01');
    nhapKho(loPhang, 'cn-1', 200, '2026-09-20T07:00:00.000Z');
    nhapKho(loThat, 'cn-1', 200, '2026-09-20T07:00:00.000Z');

    const kichBan: readonly [sanPhamId: string, dongId: string, hoaDonId: string][] = [
      ['sp-phang', 'hdd-phang', 'hd-phang'],
      ['sp-lo', 'hdd-lo', 'hd-lo'],
    ];
    for (const [sanPhamId, dongId, hoaDonId] of kichBan) {
      taoHoaDonTuGioHang(db, {
        id: hoaDonId,
        chiNhanhId: 'cn-1',
        thoiGian: '2026-09-21T08:00:00.000Z',
        phuongThucThanhToan: 'TIEN_MAT',
        dong: [moiDong({ id: dongId, sanPhamId, heSo: 12, donGia: 17_000, soLuong: 3 })],
      });
      taoPhieuTraHang(db, {
        id: `th-${sanPhamId}`,
        hoaDonId,
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: `thd-${sanPhamId}`, hoaDonDongId: dongId, soLuong: 10 }],
      });
    }

    expect(tonDem(loPhang, 'cn-1')).toBe(tonDem(loThat, 'cn-1'));
    expect(tonDem(loPhang, 'cn-1')).toBe(174);
    expect(tonDem(loThatSp, 'cn-1')).toBe(0);
  });

  it('số lượng trả bằng 0 bị từ chối', () => {
    taoChiNhanh('cn-1');
    const { hoaDonDongId } = banHangDonGian('cn-1');

    expect(() =>
      taoPhieuTraHang(db, {
        id: 'th-1',
        hoaDonId: 'hd-1',
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: 'thd-1', hoaDonDongId, soLuong: 0 }],
      }),
    ).toThrow(SoLuongKhongHopLeError);
  });

  it('phiếu trả hàng không có dòng nào bị từ chối', () => {
    taoChiNhanh('cn-1');
    banHangDonGian('cn-1');

    expect(() =>
      taoPhieuTraHang(db, { id: 'th-1', hoaDonId: 'hd-1', thoiGian: '2026-09-22T08:00:00.000Z', dong: [] }),
    ).toThrow(DongTraHangRongError);
  });

  it('hoá đơn gốc không tồn tại bị từ chối', () => {
    taoChiNhanh('cn-1');

    expect(() =>
      taoPhieuTraHang(db, {
        id: 'th-1',
        hoaDonId: 'hd-khong-ton-tai',
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: 'thd-1', hoaDonDongId: 'hdd-1', soLuong: 1 }],
      }),
    ).toThrow(HoaDonKhongTonTaiError);
  });

  it('dòng hoá đơn không thuộc hoá đơn đã khai bị từ chối', () => {
    taoChiNhanh('cn-1');
    const { hoaDonDongId } = banHangDonGian('cn-1');
    // Hoá đơn thứ hai, không có dòng hdd-1.
    const loId2 = taoSanPhamCoLo('sp-2', 'SP002');
    nhapKho(loId2, 'cn-1', 50, '2026-09-20T07:00:00.000Z');
    taoHoaDonTuGioHang(db, {
      id: 'hd-2',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:05:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [moiDong({ id: 'hdd-2', sanPhamId: 'sp-2', soLuong: 1 })],
    });

    expect(() =>
      taoPhieuTraHang(db, {
        id: 'th-1',
        hoaDonId: 'hd-2',
        thoiGian: '2026-09-22T08:00:00.000Z',
        dong: [{ id: 'thd-1', hoaDonDongId, soLuong: 1 }],
      }),
    ).toThrow(HoaDonDongKhongThuocHoaDonError);
  });

  it('mã trả hàng tự sinh tuần tự TH000001, TH000002', () => {
    taoChiNhanh('cn-1');
    const { hoaDonDongId } = banHangDonGian('cn-1');

    const th1 = taoPhieuTraHang(db, {
      id: 'th-1',
      hoaDonId: 'hd-1',
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thd-1', hoaDonDongId, soLuong: 1 }],
    });
    const th2 = taoPhieuTraHang(db, {
      id: 'th-2',
      hoaDonId: 'hd-1',
      thoiGian: '2026-09-22T09:00:00.000Z',
      dong: [{ id: 'thd-2', hoaDonDongId, soLuong: 1 }],
    });

    expect(th1.ma).toBe('TH000001');
    expect(th2.ma).toBe('TH000002');
  });
});

describe('layDanhSachTraHang (T-052b)', () => {
  it('trả về danh sách kèm liên kết ngược mã hoá đơn gốc, mới nhất trước', () => {
    taoChiNhanh('cn-1');
    const { hoaDonDongId } = banHangDonGian('cn-1');

    taoPhieuTraHang(db, {
      id: 'th-1',
      hoaDonId: 'hd-1',
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thd-1', hoaDonDongId, soLuong: 4 }],
    });
    taoPhieuTraHang(db, {
      id: 'th-2',
      hoaDonId: 'hd-1',
      thoiGian: '2026-09-22T09:00:00.000Z',
      dong: [{ id: 'thd-2', hoaDonDongId, soLuong: 3 }],
    });

    const ds = layDanhSachTraHang(db);

    expect(ds).toHaveLength(2);
    expect(ds[0]?.ma).toBe('TH000002');
    expect(ds[0]?.hoaDonId).toBe('hd-1');
    expect(ds[0]?.hoaDonMa).toBe('HD000001');
    expect(ds[0]?.tongTienHoan).toBe(3_000);
    expect(ds[1]?.ma).toBe('TH000001');
  });

  it('danh sách rỗng khi chưa có phiếu trả nào', () => {
    taoChiNhanh('cn-1');
    expect(layDanhSachTraHang(db)).toEqual([]);
  });
});

describe('layChiTietTraHang (T-052b)', () => {
  it('trả về chi tiết kèm từng dòng và liên kết ngược hoá đơn gốc', () => {
    taoChiNhanh('cn-1');
    const { hoaDonDongId } = banHangDonGian('cn-1');

    taoPhieuTraHang(db, {
      id: 'th-1',
      hoaDonId: 'hd-1',
      thoiGian: '2026-09-22T08:00:00.000Z',
      dong: [{ id: 'thd-1', hoaDonDongId, soLuong: 4 }],
    });

    const chiTiet = layChiTietTraHang(db, 'th-1');

    expect(chiTiet?.ma).toBe('TH000001');
    expect(chiTiet?.hoaDonId).toBe('hd-1');
    expect(chiTiet?.hoaDonMa).toBe('HD000001');
    expect(chiTiet?.tongTienHoan).toBe(4_000);
    expect(chiTiet?.dong).toHaveLength(1);
    expect(chiTiet?.dong[0]).toMatchObject({
      id: 'thd-1',
      hoaDonDongId,
      sanPhamId: 'sp-1',
      maHang: 'SP001',
      soLuong: 4,
      tienHoan: 4_000,
    });
  });

  it('trả về undefined khi không tìm thấy', () => {
    taoChiNhanh('cn-1');
    expect(layChiTietTraHang(db, 'khong-ton-tai')).toBeUndefined();
  });
});
