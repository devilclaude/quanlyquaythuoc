import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, hoaDon, hoaDonDong, hoaDonDongLo, loHang, sanPham, theKho, tonKhoLo } from '../db/schema';
import { KhongDuTonKhoError } from '../kho/fefo';
import { ghiTheKho } from '../kho/so-cai';
import {
  GiamGiaVuotTongError,
  GioHangRongError,
  SoLuongKhongHopLeError,
  taoHoaDonTuGioHang,
  type DongGioHang,
} from './tao-hoa-don';

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

function dongBanCuaLo(loId: string) {
  return db
    .select()
    .from(theKho)
    .where(and(eq(theKho.loId, loId), eq(theKho.loai, 'BAN')))
    .all();
}

function moiDong(overrides: Partial<DongGioHang> = {}): DongGioHang {
  return {
    id: overrides.id ?? 'hdd-1',
    sanPhamId: overrides.sanPhamId ?? 'sp-1',
    donViTen: overrides.donViTen ?? 'Vỉ',
    heSo: overrides.heSo ?? 12,
    donGia: overrides.donGia ?? 17_000,
    soLuong: overrides.soLuong ?? 3,
    ...(overrides.loUuTienThuCong !== undefined ? { loUuTienThuCong: overrides.loUuTienThuCong } : {}),
  };
}

describe('taoHoaDonTuGioHang', () => {
  it('tạo hoá đơn một dòng, quy đổi đúng đơn vị đã chọn ra đơn vị cơ sở khi trừ kho (SPEC.md §3.3: bán 3 vỉ, hệ số 12 → trừ 36 viên)', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 'cn-1', 100, '2026-09-20T07:00:00.000Z', 1_000_000);

    const ketQua = taoHoaDonTuGioHang(db, {
      id: 'hd-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:00:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [moiDong({ soLuong: 3, heSo: 12 })],
    });

    expect(ketQua.id).toBe('hd-1');
    expect(tonDem(loId, 'cn-1')).toBe(64);
    const dongTheKho = dongBanCuaLo(loId);
    expect(dongTheKho).toHaveLength(1);
    expect(dongTheKho[0]?.soLuong).toBe(-36);

    const [dongLo] = db.select().from(hoaDonDongLo).where(eq(hoaDonDongLo.loId, loId)).all();
    expect(dongLo?.soLuong).toBe(36);
  });

  it('mã hoá đơn tự sinh tuần tự HD000001, HD000002', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 'cn-1', 100, '2026-09-20T07:00:00.000Z');

    const hd1 = taoHoaDonTuGioHang(db, {
      id: 'hd-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:00:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [moiDong({ id: 'hdd-1', soLuong: 1 })],
    });
    const hd2 = taoHoaDonTuGioHang(db, {
      id: 'hd-2',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:05:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [moiDong({ id: 'hdd-2', soLuong: 1 })],
    });

    expect(hd1.ma).toBe('HD000001');
    expect(hd2.ma).toBe('HD000002');
  });

  it('phân bổ giảm giá hoá đơn theo số dư lớn nhất — SPEC.md §3.4: 10.000/20.000/30.000 giảm 7.000 → 1.167/2.333/3.500', () => {
    taoChiNhanh('cn-1');
    const loA = taoSanPhamCoLo('sp-a', 'SPA');
    const loB = taoSanPhamCoLo('sp-b', 'SPB');
    const loC = taoSanPhamCoLo('sp-c', 'SPC');
    for (const loId of [loA, loB, loC]) nhapKho(loId, 'cn-1', 100, '2026-09-20T07:00:00.000Z');

    const ketQua = taoHoaDonTuGioHang(db, {
      id: 'hd-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:00:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      giamGia: 7_000,
      dong: [
        moiDong({ id: 'hdd-a', sanPhamId: 'sp-a', heSo: 1, donGia: 10_000, soLuong: 1 }),
        moiDong({ id: 'hdd-b', sanPhamId: 'sp-b', heSo: 1, donGia: 20_000, soLuong: 1 }),
        moiDong({ id: 'hdd-c', sanPhamId: 'sp-c', heSo: 1, donGia: 30_000, soLuong: 1 }),
      ],
    });

    expect(ketQua.tongTienHang).toBe(60_000);
    const dongDaGhi = db.select().from(hoaDonDong).where(eq(hoaDonDong.hoaDonId, 'hd-1')).all();
    const theoId = new Map(dongDaGhi.map((d) => [d.id, d.giamGiaPhanBo]));
    expect(theoId.get('hdd-a')).toBe(1_167);
    expect(theoId.get('hdd-b')).toBe(2_333);
    expect(theoId.get('hdd-c')).toBe(3_500);
    expect((theoId.get('hdd-a') ?? 0) + (theoId.get('hdd-b') ?? 0) + (theoId.get('hdd-c') ?? 0)).toBe(7_000);
  });

  it('đẳng thức khách_cần_trả = tổng_tiền_hàng − giảm_giá + thu_khác + làm_tròn (SPEC.md §3.4)', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 'cn-1', 100, '2026-09-20T07:00:00.000Z');

    const ketQua = taoHoaDonTuGioHang(db, {
      id: 'hd-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:00:00.000Z',
      phuongThucThanhToan: 'CHUYEN_KHOAN',
      giamGia: 5_000,
      thuKhac: 2_000,
      lamTron: -500,
      dong: [moiDong({ heSo: 1, donGia: 50_000, soLuong: 1 })],
    });

    expect(ketQua.tongTienHang).toBe(50_000);
    expect(ketQua.khachCanTra).toBe(50_000 - 5_000 + 2_000 - 500);
  });

  it('làm tròn mặc định tắt — không truyền lam_tron thì luôn 0', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 'cn-1', 100, '2026-09-20T07:00:00.000Z');

    const ketQua = taoHoaDonTuGioHang(db, {
      id: 'hd-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:00:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [moiDong({ heSo: 1, donGia: 50_000, soLuong: 1 })],
    });

    expect(ketQua.lamTron).toBe(0);
    expect(ketQua.khachCanTra).toBe(50_000);
  });

  it('giảm giá vượt tổng tiền hàng bị từ chối, không ghi gì', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 'cn-1', 100, '2026-09-20T07:00:00.000Z');

    expect(() =>
      taoHoaDonTuGioHang(db, {
        id: 'hd-1',
        chiNhanhId: 'cn-1',
        thoiGian: '2026-09-21T08:00:00.000Z',
        phuongThucThanhToan: 'TIEN_MAT',
        giamGia: 999_999,
        dong: [moiDong({ heSo: 1, donGia: 50_000, soLuong: 1 })],
      }),
    ).toThrow(GiamGiaVuotTongError);
    expect(tonDem(loId, 'cn-1')).toBe(100);
    expect(db.select().from(hoaDon).all()).toHaveLength(0);
  });

  it('giỏ hàng rỗng bị từ chối', () => {
    taoChiNhanh('cn-1');

    expect(() =>
      taoHoaDonTuGioHang(db, {
        id: 'hd-1',
        chiNhanhId: 'cn-1',
        thoiGian: '2026-09-21T08:00:00.000Z',
        phuongThucThanhToan: 'TIEN_MAT',
        dong: [],
      }),
    ).toThrow(GioHangRongError);
  });

  it('số lượng dòng bằng 0 bị từ chối, không ghi gì', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 'cn-1', 100, '2026-09-20T07:00:00.000Z');

    expect(() =>
      taoHoaDonTuGioHang(db, {
        id: 'hd-1',
        chiNhanhId: 'cn-1',
        thoiGian: '2026-09-21T08:00:00.000Z',
        phuongThucThanhToan: 'TIEN_MAT',
        dong: [moiDong({ soLuong: 0 })],
      }),
    ).toThrow(SoLuongKhongHopLeError);
    expect(tonDem(loId, 'cn-1')).toBe(100);
    expect(db.select().from(hoaDon).all()).toHaveLength(0);
  });

  it('tồn không đủ ở một lô thì chia đúng sang lô kế tiếp theo FEFO (SPEC.md §9 bất biến 10)', () => {
    taoChiNhanh('cn-1');
    const loNgamDinh = taoSanPhamCoLo('sp-1', 'SP001');
    const loThat = 'lo-that-1';
    taoLoThat(loThat, 'sp-1', 'L001', '2027-01-01');
    nhapKho(loNgamDinh, 'cn-1', 5, '2026-09-19T07:00:00.000Z');
    nhapKho(loThat, 'cn-1', 100, '2026-09-20T07:00:00.000Z');

    // FEFO: NULLS FIRST → lô ngầm định (5 viên) hết trước, tràn 3 viên sang lô thật.
    taoHoaDonTuGioHang(db, {
      id: 'hd-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:00:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [moiDong({ heSo: 1, donGia: 1_000, soLuong: 8 })],
    });

    expect(tonDem(loNgamDinh, 'cn-1')).toBe(0);
    expect(tonDem(loThat, 'cn-1')).toBe(97);
    const dongLo = db.select().from(hoaDonDongLo).where(eq(hoaDonDongLo.hoaDonDongId, 'hdd-1')).all();
    const theoLo = new Map(dongLo.map((d) => [d.loId, d.soLuong]));
    expect(theoLo.get(loNgamDinh)).toBe(5);
    expect(theoLo.get(loThat)).toBe(3);
  });

  it('FEFO ưu tiên lô có HSD sớm hơn dù đã hết hạn — bán hàng không tự chặn hàng hết hạn (xuất huỷ mới là đường xử lý)', () => {
    taoChiNhanh('cn-1');
    taoSanPhamCoLo('sp-1', 'SP001');
    const loHetHan = 'lo-het-han';
    const loConHan = 'lo-con-han';
    taoLoThat(loHetHan, 'sp-1', 'L001', '2020-01-01');
    taoLoThat(loConHan, 'sp-1', 'L002', '2030-01-01');
    nhapKho(loConHan, 'cn-1', 50, '2026-09-19T07:00:00.000Z');
    nhapKho(loHetHan, 'cn-1', 50, '2026-09-20T07:00:00.000Z');

    taoHoaDonTuGioHang(db, {
      id: 'hd-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:00:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [moiDong({ heSo: 1, donGia: 1_000, soLuong: 10 })],
    });

    expect(tonDem(loHetHan, 'cn-1')).toBe(40);
    expect(tonDem(loConHan, 'cn-1')).toBe(50);
  });

  it('hai hoá đơn liên tiếp cùng bán hộp cuối khi online → hoá đơn thứ hai bị từ chối', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    nhapKho(loId, 'cn-1', 1, '2026-09-20T07:00:00.000Z');

    taoHoaDonTuGioHang(db, {
      id: 'hd-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-21T08:00:00.000Z',
      phuongThucThanhToan: 'TIEN_MAT',
      dong: [moiDong({ id: 'hdd-1', heSo: 1, donGia: 1_000, soLuong: 1 })],
    });

    expect(() =>
      taoHoaDonTuGioHang(db, {
        id: 'hd-2',
        chiNhanhId: 'cn-1',
        thoiGian: '2026-09-21T08:00:01.000Z',
        phuongThucThanhToan: 'TIEN_MAT',
        dong: [moiDong({ id: 'hdd-2', heSo: 1, donGia: 1_000, soLuong: 1 })],
      }),
    ).toThrow(KhongDuTonKhoError);
    expect(tonDem(loId, 'cn-1')).toBe(0);
    expect(db.select().from(hoaDon).where(eq(hoaDon.id, 'hd-2')).all()).toHaveLength(0);
  });

  it('bán vượt tồn ở bất kỳ dòng nào rollback toàn bộ, không tạo hoá đơn "một nửa"', () => {
    taoChiNhanh('cn-1');
    const loA = taoSanPhamCoLo('sp-a', 'SPA');
    const loB = taoSanPhamCoLo('sp-b', 'SPB');
    nhapKho(loA, 'cn-1', 100, '2026-09-20T07:00:00.000Z');
    nhapKho(loB, 'cn-1', 2, '2026-09-20T07:00:00.000Z');

    expect(() =>
      taoHoaDonTuGioHang(db, {
        id: 'hd-1',
        chiNhanhId: 'cn-1',
        thoiGian: '2026-09-21T08:00:00.000Z',
        phuongThucThanhToan: 'TIEN_MAT',
        dong: [
          moiDong({ id: 'hdd-a', sanPhamId: 'sp-a', heSo: 1, donGia: 1_000, soLuong: 10 }),
          moiDong({ id: 'hdd-b', sanPhamId: 'sp-b', heSo: 1, donGia: 1_000, soLuong: 10 }),
        ],
      }),
    ).toThrow(KhongDuTonKhoError);

    expect(tonDem(loA, 'cn-1')).toBe(100);
    expect(tonDem(loB, 'cn-1')).toBe(2);
    expect(db.select().from(hoaDon).all()).toHaveLength(0);
    expect(db.select().from(hoaDonDong).all()).toHaveLength(0);
  });

  it('chạy cùng kịch bản ở chế độ phẳng (lô ngầm định) và có lô thật cho cùng số dư cuối (SPEC.md §9 bất biến 6)', () => {
    taoChiNhanh('cn-1');
    const loPhang = taoSanPhamCoLo('sp-phang', 'SPPHANG');
    const loThatSp = taoSanPhamCoLo('sp-lo', 'SPLO');
    const loThat = 'lo-that-1';
    taoLoThat(loThat, 'sp-lo', 'L001', '2027-01-01');
    nhapKho(loPhang, 'cn-1', 200, '2026-09-20T07:00:00.000Z');
    nhapKho(loThat, 'cn-1', 200, '2026-09-20T07:00:00.000Z');

    const kichBan: readonly [sanPhamId: string, dongId: string][] = [
      ['sp-phang', 'hdd-phang'],
      ['sp-lo', 'hdd-lo'],
    ];
    for (const [sanPhamId, dongId] of kichBan) {
      taoHoaDonTuGioHang(db, {
        id: `hd-${sanPhamId}`,
        chiNhanhId: 'cn-1',
        thoiGian: '2026-09-21T08:00:00.000Z',
        phuongThucThanhToan: 'TIEN_MAT',
        dong: [moiDong({ id: dongId, sanPhamId, heSo: 12, donGia: 17_000, soLuong: 3 })],
      });
    }

    expect(tonDem(loPhang, 'cn-1')).toBe(tonDem(loThat, 'cn-1'));
    expect(tonDem(loPhang, 'cn-1')).toBe(164);
    expect(tonDem(loThatSp, 'cn-1')).toBe(0);
  });
});
