import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { caiDat, chiNhanh, loHang, phieuNhap, sanPham, theKho, tonKhoLo } from '../db/schema';
import {
  LoHsdKhongDayDuError,
  PhieuDaHoanThanhError,
  PhieuNhapKhongTonTaiError,
  SoLuongKhongHopLeError,
  ThieuLoHsdError,
  hoanThanhPhieuNhap,
  taoPhieuNhap,
} from './tao-phieu-nhap';

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

function batToanCuc() {
  db.update(caiDat).set({ quanLyLo: true }).where(eq(caiDat.id, 1)).run();
}

function tonDem(loId: string, chiNhanhId: string): number {
  const [row] = db
    .select()
    .from(tonKhoLo)
    .where(and(eq(tonKhoLo.loId, loId), eq(tonKhoLo.chiNhanhId, chiNhanhId)))
    .all();
  return row?.ton ?? 0;
}

function giaTriTonDem(loId: string, chiNhanhId: string): number {
  const [row] = db
    .select()
    .from(tonKhoLo)
    .where(and(eq(tonKhoLo.loId, loId), eq(tonKhoLo.chiNhanhId, chiNhanhId)))
    .all();
  return row?.giaTriTon ?? 0;
}

describe('taoPhieuNhap', () => {
  it('lưu tạm không ghi kho', () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');

    const ket = taoPhieuNhap(db, {
      id: 'pn-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      dong: [{ id: 'pnd-1', sanPhamId: 'sp-1', donViTen: 'hộp', heSo: 180, donGia: 260_000, soLuong: 5 }],
    });

    expect(ket.trangThai).toBe('PHIEU_TAM');
    expect(ket.ma).toMatch(/^PN\d{6}$/);
    expect(tonDem(loMacDinh, 'cn-1')).toBe(0);
    expect(db.select().from(theKho).all()).toHaveLength(0);
  });

  it('hoàn thành ngay quy đổi đơn vị đúng và ghi giá trị nhập không qua phép chia (SPEC.md §3.3/§3.4)', () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');

    taoPhieuNhap(db, {
      id: 'pn-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      hoanThanhNgay: true,
      dong: [{ id: 'pnd-1', sanPhamId: 'sp-1', donViTen: 'hộp', heSo: 180, donGia: 260_000, soLuong: 5 }],
    });

    // 5 hộp × 180 viên/hộp = 900 viên (SPEC.md §3.3 ví dụ chuẩn).
    expect(tonDem(loMacDinh, 'cn-1')).toBe(900);
    // Giá trị tồn = tổng tiền nhập = đơn giá(hộp) × số lượng(hộp), không chia.
    expect(giaTriTonDem(loMacDinh, 'cn-1')).toBe(260_000 * 5);
  });

  it('sản phẩm tắt quản lý lô bỏ qua lô/HSD, rơi đúng lô ngầm định', () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001', 'TAT');

    taoPhieuNhap(db, {
      id: 'pn-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      hoanThanhNgay: true,
      dong: [{ id: 'pnd-1', sanPhamId: 'sp-1', donViTen: 'viên', heSo: 1, donGia: 1_500, soLuong: 100 }],
    });

    expect(tonDem(loMacDinh, 'cn-1')).toBe(100);
    const [dongTk] = db.select().from(theKho).where(eq(theKho.loId, loMacDinh)).all();
    expect(dongTk?.loai).toBe('NHAP');
  });

  it('thiếu HSD khi sản phẩm bật quản lý lô bị từ chối, không ghi gì cả', () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001', 'BAT');

    expect(() =>
      taoPhieuNhap(db, {
        id: 'pn-1',
        chiNhanhId: 'cn-1',
        thoiGian: '2026-09-27T07:00:00.000Z',
        hoanThanhNgay: true,
        dong: [
          {
            id: 'pnd-1',
            sanPhamId: 'sp-1',
            donViTen: 'hộp',
            heSo: 180,
            donGia: 260_000,
            soLuong: 5,
          },
        ],
      }),
    ).toThrow(ThieuLoHsdError);

    expect(tonDem(loMacDinh, 'cn-1')).toBe(0);
    expect(db.select().from(phieuNhap).all()).toHaveLength(0);
  });

  it('khai chỉ một trong hai (số lô hoặc HSD) bị từ chối dù đang tắt quản lý lô', () => {
    taoSanPham('sp-1', 'SP001', 'TAT');

    expect(() =>
      taoPhieuNhap(db, {
        id: 'pn-1',
        chiNhanhId: 'cn-1',
        thoiGian: '2026-09-27T07:00:00.000Z',
        hoanThanhNgay: true,
        dong: [
          {
            id: 'pnd-1',
            sanPhamId: 'sp-1',
            donViTen: 'viên',
            heSo: 1,
            donGia: 1_500,
            soLuong: 10,
            soLo: null,
            hsd: '2027-01-01',
          },
        ],
      }),
    ).toThrow(LoHsdKhongDayDuError);
  });

  it('nhập vào lô đã tồn tại (cùng số lô + HSD) cộng dồn đúng lô cũ, không tạo lô trùng', () => {
    taoSanPham('sp-1', 'SP001', 'BAT');

    taoPhieuNhap(db, {
      id: 'pn-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      hoanThanhNgay: true,
      dong: [
        {
          id: 'pnd-1',
          sanPhamId: 'sp-1',
          donViTen: 'viên',
          heSo: 1,
          donGia: 1_500,
          soLuong: 100,
          soLo: 'LOT-01',
          hsd: '2027-06-30',
        },
      ],
    });

    taoPhieuNhap(db, {
      id: 'pn-2',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T08:00:00.000Z',
      hoanThanhNgay: true,
      dong: [
        {
          id: 'pnd-2',
          sanPhamId: 'sp-1',
          donViTen: 'viên',
          heSo: 1,
          donGia: 1_500,
          soLuong: 50,
          soLo: 'LOT-01',
          hsd: '2027-06-30',
        },
      ],
    });

    const cacLoThat = db
      .select()
      .from(loHang)
      .where(and(eq(loHang.sanPhamId, 'sp-1'), eq(loHang.soLo, 'LOT-01')))
      .all();
    expect(cacLoThat).toHaveLength(1);
    expect(tonDem(cacLoThat[0]!.id, 'cn-1')).toBe(150);
  });

  it('số lượng 0 bị từ chối, không ghi gì cả', () => {
    taoSanPham('sp-1', 'SP001');

    expect(() =>
      taoPhieuNhap(db, {
        id: 'pn-1',
        chiNhanhId: 'cn-1',
        thoiGian: '2026-09-27T07:00:00.000Z',
        dong: [{ id: 'pnd-1', sanPhamId: 'sp-1', donViTen: 'viên', heSo: 1, donGia: 1_500, soLuong: 0 }],
      }),
    ).toThrow(SoLuongKhongHopLeError);

    expect(db.select().from(phieuNhap).all()).toHaveLength(0);
  });

  it('cùng kịch bản chạy trên lô ngầm định (chế độ phẳng) và lô thật (chế độ lô) ra cùng số dư cuối (SPEC.md §9 bất biến 6)', () => {
    const loPhang = taoSanPham('sp-phang', 'SPPHANG', 'TAT');
    taoSanPham('sp-lo', 'SPLO', 'BAT');

    taoPhieuNhap(db, {
      id: 'pn-phang',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      hoanThanhNgay: true,
      dong: [{ id: 'pnd-phang', sanPhamId: 'sp-phang', donViTen: 'hộp', heSo: 12, donGia: 20_000, soLuong: 3 }],
    });

    taoPhieuNhap(db, {
      id: 'pn-lo',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      hoanThanhNgay: true,
      dong: [
        {
          id: 'pnd-lo',
          sanPhamId: 'sp-lo',
          donViTen: 'hộp',
          heSo: 12,
          donGia: 20_000,
          soLuong: 3,
          soLo: 'L01',
          hsd: '2027-01-01',
        },
      ],
    });

    const [loThat] = db.select().from(loHang).where(and(eq(loHang.sanPhamId, 'sp-lo'), eq(loHang.soLo, 'L01'))).all();
    expect(tonDem(loPhang, 'cn-1')).toBe(tonDem(loThat!.id, 'cn-1'));
    expect(tonDem(loPhang, 'cn-1')).toBe(36);
  });

  it('mã phiếu tự sinh tuần tự, khác nhau giữa các phiếu', () => {
    taoSanPham('sp-1', 'SP001');

    const p1 = taoPhieuNhap(db, {
      id: 'pn-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      dong: [{ id: 'pnd-1', sanPhamId: 'sp-1', donViTen: 'viên', heSo: 1, donGia: 1_500, soLuong: 10 }],
    });
    const p2 = taoPhieuNhap(db, {
      id: 'pn-2',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      dong: [{ id: 'pnd-2', sanPhamId: 'sp-1', donViTen: 'viên', heSo: 1, donGia: 1_500, soLuong: 10 }],
    });

    expect(p1.ma).not.toBe(p2.ma);
  });
});

describe('hoanThanhPhieuNhap', () => {
  it('hoàn thành một phiếu tạm ghi kho đúng và chuyển trạng thái', () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');
    const tao = taoPhieuNhap(db, {
      id: 'pn-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      dong: [{ id: 'pnd-1', sanPhamId: 'sp-1', donViTen: 'viên', heSo: 1, donGia: 1_500, soLuong: 40 }],
    });
    expect(tao.trangThai).toBe('PHIEU_TAM');

    hoanThanhPhieuNhap(db, 'pn-1', '2026-09-27T09:00:00.000Z');

    expect(tonDem(loMacDinh, 'cn-1')).toBe(40);
    const [phieu] = db.select().from(phieuNhap).where(eq(phieuNhap.id, 'pn-1')).all();
    expect(phieu?.trangThai).toBe('HOAN_THANH');
  });

  it('hoàn thành một phiếu đã hoàn thành bị từ chối — idempotent, không ghi kho lần hai', () => {
    const loMacDinh = taoSanPham('sp-1', 'SP001');
    taoPhieuNhap(db, {
      id: 'pn-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      hoanThanhNgay: true,
      dong: [{ id: 'pnd-1', sanPhamId: 'sp-1', donViTen: 'viên', heSo: 1, donGia: 1_500, soLuong: 40 }],
    });

    expect(() => hoanThanhPhieuNhap(db, 'pn-1', '2026-09-27T09:00:00.000Z')).toThrow(PhieuDaHoanThanhError);
    expect(tonDem(loMacDinh, 'cn-1')).toBe(40);
  });

  it('hoàn thành một phiếu không tồn tại bị từ chối', () => {
    expect(() => hoanThanhPhieuNhap(db, 'khong-ton-tai', '2026-09-27T09:00:00.000Z')).toThrow(
      PhieuNhapKhongTonTaiError,
    );
  });

  it('bật quản lý lô toàn cục (không ghi đè riêng sản phẩm) cũng bắt buộc lô + HSD lúc hoàn thành', () => {
    taoSanPham('sp-1', 'SP001');
    batToanCuc();

    taoPhieuNhap(db, {
      id: 'pn-1',
      chiNhanhId: 'cn-1',
      thoiGian: '2026-09-27T07:00:00.000Z',
      dong: [{ id: 'pnd-1', sanPhamId: 'sp-1', donViTen: 'viên', heSo: 1, donGia: 1_500, soLuong: 10 }],
    });

    expect(() => hoanThanhPhieuNhap(db, 'pn-1', '2026-09-27T09:00:00.000Z')).toThrow(ThieuLoHsdError);
  });
});
