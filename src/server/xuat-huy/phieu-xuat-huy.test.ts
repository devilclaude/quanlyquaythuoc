import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, loHang, phieuXuatHuyDong, sanPham, theKho, tonKhoLo } from '../db/schema';
import { KhongDuTonKhoError } from '../kho/fefo';
import { ghiTheKho } from '../kho/so-cai';
import { LyDoBatBuocError, NguoiThucHienBatBuocError, taoPhieuXuatHuy } from './phieu-xuat-huy';

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

function tonDem(loId: string, chiNhanhId: string): number {
  const [row] = db
    .select()
    .from(tonKhoLo)
    .where(and(eq(tonKhoLo.loId, loId), eq(tonKhoLo.chiNhanhId, chiNhanhId)))
    .all();
  return row?.ton ?? 0;
}

function dongTheKhoCuaLo(loId: string) {
  return db.select().from(theKho).where(eq(theKho.loId, loId)).all();
}

describe('taoPhieuXuatHuy', () => {
  it('ghi thẻ kho XUAT_HUY âm đúng bằng số lượng huỷ và trừ đúng lô', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [{ id: 'tk-nhap', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 100, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    taoPhieuXuatHuy(db, {
      id: 'pxh-1',
      chiNhanhId: 'cn-1',
      lyDo: 'Hết hạn sử dụng',
      nguoiThucHien: 'Dược sĩ Lan',
      thoiGian: '2026-09-16T08:00:00.000Z',
      dong: [{ id: 'pxhd-1', loId, soLuong: 10 }],
    });

    expect(tonDem(loId, 'cn-1')).toBe(90);
    const dong = dongTheKhoCuaLo(loId).find((d) => d.loai === 'XUAT_HUY');
    expect(dong?.soLuong).toBe(-10);
  });

  it('lý do rỗng hoặc chỉ khoảng trắng bị từ chối, không ghi gì cả', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [{ id: 'tk-nhap', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 100, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    expect(() =>
      taoPhieuXuatHuy(db, {
        id: 'pxh-1',
        chiNhanhId: 'cn-1',
        lyDo: '   ',
        nguoiThucHien: 'Dược sĩ Lan',
        thoiGian: '2026-09-16T08:00:00.000Z',
        dong: [{ id: 'pxhd-1', loId, soLuong: 10 }],
      }),
    ).toThrow(LyDoBatBuocError);
    expect(tonDem(loId, 'cn-1')).toBe(100);
    expect(dongTheKhoCuaLo(loId).some((d) => d.loai === 'XUAT_HUY')).toBe(false);
  });

  it('người thực hiện rỗng hoặc chỉ khoảng trắng bị từ chối, không ghi gì cả', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [{ id: 'tk-nhap', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 100, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    expect(() =>
      taoPhieuXuatHuy(db, {
        id: 'pxh-1',
        chiNhanhId: 'cn-1',
        lyDo: 'Hết hạn sử dụng',
        nguoiThucHien: '  ',
        thoiGian: '2026-09-16T08:00:00.000Z',
        dong: [{ id: 'pxhd-1', loId, soLuong: 10 }],
      }),
    ).toThrow(NguoiThucHienBatBuocError);
    expect(tonDem(loId, 'cn-1')).toBe(100);
    expect(dongTheKhoCuaLo(loId).some((d) => d.loai === 'XUAT_HUY')).toBe(false);
  });

  it('nhiều lô trong cùng một phiếu tính đúng riêng biệt cho từng lô, không lẫn', () => {
    taoChiNhanh('cn-1');
    const loA = taoSanPhamCoLo('sp-a', 'SPA');
    const loB = taoSanPhamCoLo('sp-b', 'SPB');
    ghiTheKho(db, [{ id: 'tk-a', chiNhanhId: 'cn-1', loId: loA, loai: 'NHAP', soLuong: 50, thoiGian: '2026-09-16T07:00:00.000Z' }]);
    ghiTheKho(db, [{ id: 'tk-b', chiNhanhId: 'cn-1', loId: loB, loai: 'NHAP', soLuong: 200, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    taoPhieuXuatHuy(db, {
      id: 'pxh-1',
      chiNhanhId: 'cn-1',
      lyDo: 'Vỡ hàng lúc vận chuyển',
      nguoiThucHien: 'Dược sĩ Lan',
      thoiGian: '2026-09-16T08:00:00.000Z',
      dong: [
        { id: 'pxhd-a', loId: loA, soLuong: 5 },
        { id: 'pxhd-b', loId: loB, soLuong: 20 },
      ],
    });

    expect(tonDem(loA, 'cn-1')).toBe(45);
    expect(tonDem(loB, 'cn-1')).toBe(180);
  });

  it('huỷ vượt quá tồn hiện tại bị từ chối — không được để tồn âm mà không có bản ghi giải thích (CLAUDE.md)', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [{ id: 'tk-nhap', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 5, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    expect(() =>
      taoPhieuXuatHuy(db, {
        id: 'pxh-1',
        chiNhanhId: 'cn-1',
        lyDo: 'Hết hạn sử dụng',
        nguoiThucHien: 'Dược sĩ Lan',
        thoiGian: '2026-09-16T08:00:00.000Z',
        dong: [{ id: 'pxhd-1', loId, soLuong: 10 }],
      }),
    ).toThrow(KhongDuTonKhoError);
    expect(tonDem(loId, 'cn-1')).toBe(5);
    expect(dongTheKhoCuaLo(loId).some((d) => d.loai === 'XUAT_HUY')).toBe(false);
    expect(db.select().from(phieuXuatHuyDong).all()).toHaveLength(0);
  });

  it('không cho xuất huỷ cùng một lô hai lần trong cùng phiếu — rollback toàn bộ', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [{ id: 'tk-nhap', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 100, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    expect(() =>
      taoPhieuXuatHuy(db, {
        id: 'pxh-1',
        chiNhanhId: 'cn-1',
        lyDo: 'Hết hạn sử dụng',
        nguoiThucHien: 'Dược sĩ Lan',
        thoiGian: '2026-09-16T08:00:00.000Z',
        dong: [
          { id: 'pxhd-1', loId, soLuong: 10 },
          { id: 'pxhd-2', loId, soLuong: 5 },
        ],
      }),
    ).toThrow();

    expect(tonDem(loId, 'cn-1')).toBe(100);
    expect(dongTheKhoCuaLo(loId).some((d) => d.loai === 'XUAT_HUY')).toBe(false);
  });

  it('chạy cùng kịch bản trên lô ngầm định (chế độ phẳng) và lô thật (chế độ lô) ra cùng số dư cuối', () => {
    taoChiNhanh('cn-1');
    const loPhang = taoSanPhamCoLo('sp-phang', 'SPPHANG');
    const loThat = taoSanPhamCoLo('sp-lo', 'SPLO');

    for (const loId of [loPhang, loThat]) {
      ghiTheKho(db, [{ id: `tk-nhap-${loId}`, chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 200, thoiGian: '2026-09-16T07:00:00.000Z' }]);
    }

    for (const loId of [loPhang, loThat]) {
      taoPhieuXuatHuy(db, {
        id: `pxh-${loId}`,
        chiNhanhId: 'cn-1',
        lyDo: 'Hết hạn sử dụng',
        nguoiThucHien: 'Dược sĩ Lan',
        thoiGian: '2026-09-16T08:00:00.000Z',
        dong: [{ id: `pxhd-${loId}`, loId, soLuong: 12 }],
      });
    }

    expect(tonDem(loPhang, 'cn-1')).toBe(tonDem(loThat, 'cn-1'));
    expect(tonDem(loPhang, 'cn-1')).toBe(188);
  });
});
