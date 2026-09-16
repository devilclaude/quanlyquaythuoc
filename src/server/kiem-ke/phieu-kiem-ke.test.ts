import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, loHang, phieuKiemKeDong, sanPham, theKho, tonKhoLo } from '../db/schema';
import { ghiTheKho } from '../kho/so-cai';
import { LyDoBatBuocError, taoPhieuKiemKe } from './phieu-kiem-ke';

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

describe('taoPhieuKiemKe', () => {
  it('thực tế nhiều hơn sổ sách thì ghi thẻ kho KIEM_KE dương đúng bằng chênh lệch', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [{ id: 'tk-nhap', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 100, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    taoPhieuKiemKe(db, {
      id: 'pkk-1',
      chiNhanhId: 'cn-1',
      lyDo: 'Kiểm kê định kỳ',
      thoiGian: '2026-09-16T08:00:00.000Z',
      dong: [{ id: 'pkkd-1', loId, soLuongThucTe: 105 }],
    });

    expect(tonDem(loId, 'cn-1')).toBe(105);
    const dong = dongTheKhoCuaLo(loId).find((d) => d.loai === 'KIEM_KE');
    expect(dong?.soLuong).toBe(5);
  });

  it('thực tế ít hơn sổ sách thì ghi thẻ kho KIEM_KE âm đúng bằng chênh lệch', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [{ id: 'tk-nhap', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 100, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    taoPhieuKiemKe(db, {
      id: 'pkk-1',
      chiNhanhId: 'cn-1',
      lyDo: 'Vỡ hàng lúc vận chuyển',
      thoiGian: '2026-09-16T08:00:00.000Z',
      dong: [{ id: 'pkkd-1', loId, soLuongThucTe: 90 }],
    });

    expect(tonDem(loId, 'cn-1')).toBe(90);
    const dong = dongTheKhoCuaLo(loId).find((d) => d.loai === 'KIEM_KE');
    expect(dong?.soLuong).toBe(-10);
  });

  it('thực tế đúng bằng sổ sách thì không ghi thẻ kho, chỉ lưu dòng phiếu để đối chiếu', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [{ id: 'tk-nhap', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 100, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    taoPhieuKiemKe(db, {
      id: 'pkk-1',
      chiNhanhId: 'cn-1',
      lyDo: 'Kiểm kê định kỳ',
      thoiGian: '2026-09-16T08:00:00.000Z',
      dong: [{ id: 'pkkd-1', loId, soLuongThucTe: 100 }],
    });

    expect(tonDem(loId, 'cn-1')).toBe(100);
    expect(dongTheKhoCuaLo(loId).some((d) => d.loai === 'KIEM_KE')).toBe(false);
    const [dongPhieu] = db.select().from(phieuKiemKeDong).where(eq(phieuKiemKeDong.phieuId, 'pkk-1')).all();
    expect(dongPhieu).toMatchObject({ soLuongSoSach: 100, soLuongThucTe: 100 });
  });

  it('lý do rỗng hoặc chỉ khoảng trắng bị từ chối, không ghi gì cả', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    expect(() =>
      taoPhieuKiemKe(db, {
        id: 'pkk-1',
        chiNhanhId: 'cn-1',
        lyDo: '   ',
        thoiGian: '2026-09-16T08:00:00.000Z',
        dong: [{ id: 'pkkd-1', loId, soLuongThucTe: 0 }],
      }),
    ).toThrow(LyDoBatBuocError);
    expect(dongTheKhoCuaLo(loId)).toHaveLength(0);
  });

  it('nhiều lô trong cùng một phiếu tính đúng riêng biệt cho từng lô, không lẫn', () => {
    taoChiNhanh('cn-1');
    const loA = taoSanPhamCoLo('sp-a', 'SPA');
    const loB = taoSanPhamCoLo('sp-b', 'SPB');
    ghiTheKho(db, [{ id: 'tk-a', chiNhanhId: 'cn-1', loId: loA, loai: 'NHAP', soLuong: 50, thoiGian: '2026-09-16T07:00:00.000Z' }]);
    ghiTheKho(db, [{ id: 'tk-b', chiNhanhId: 'cn-1', loId: loB, loai: 'NHAP', soLuong: 200, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    taoPhieuKiemKe(db, {
      id: 'pkk-1',
      chiNhanhId: 'cn-1',
      lyDo: 'Kiểm kê định kỳ',
      thoiGian: '2026-09-16T08:00:00.000Z',
      dong: [
        { id: 'pkkd-a', loId: loA, soLuongThucTe: 48 },
        { id: 'pkkd-b', loId: loB, soLuongThucTe: 210 },
      ],
    });

    expect(tonDem(loA, 'cn-1')).toBe(48);
    expect(tonDem(loB, 'cn-1')).toBe(210);
  });

  it('sửa được cảnh báo lệch kho: tồn đang âm do bán quá tay lúc offline (SPEC.md §4.4)', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    // Mô phỏng tồn đã lệch âm — hai máy cùng bán hộp cuối lúc mất mạng.
    ghiTheKho(db, [{ id: 'tk-ban', chiNhanhId: 'cn-1', loId, loai: 'BAN', soLuong: -5, thoiGian: '2026-09-16T07:00:00.000Z' }]);
    expect(tonDem(loId, 'cn-1')).toBe(-5);

    taoPhieuKiemKe(db, {
      id: 'pkk-1',
      chiNhanhId: 'cn-1',
      lyDo: 'Xử lý cảnh báo lệch kho — đếm lại thực tế',
      thoiGian: '2026-09-16T08:00:00.000Z',
      dong: [{ id: 'pkkd-1', loId, soLuongThucTe: 0 }],
    });

    expect(tonDem(loId, 'cn-1')).toBe(0);
    const dong = dongTheKhoCuaLo(loId).find((d) => d.loai === 'KIEM_KE');
    expect(dong?.soLuong).toBe(5);
  });

  it('gán được lô thật cho tồn cũ đang nằm ở lô ngầm định — tổng tồn sản phẩm không đổi', () => {
    taoChiNhanh('cn-1');
    const loNgamDinh = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [
      {
        id: 'tk-nhap',
        chiNhanhId: 'cn-1',
        loId: loNgamDinh,
        loai: 'NHAP',
        soLuong: 50,
        thoiGian: '2026-09-16T07:00:00.000Z',
      },
    ]);
    taoLoThat('lo-that-1', 'sp-1', 'L001', '2027-01-01');

    taoPhieuKiemKe(db, {
      id: 'pkk-1',
      chiNhanhId: 'cn-1',
      lyDo: 'Gán lô thật cho tồn cũ sau khi đếm nhãn hộp',
      thoiGian: '2026-09-16T08:00:00.000Z',
      dong: [
        { id: 'pkkd-ngam-dinh', loId: loNgamDinh, soLuongThucTe: 0 },
        { id: 'pkkd-lo-that', loId: 'lo-that-1', soLuongThucTe: 50 },
      ],
    });

    expect(tonDem(loNgamDinh, 'cn-1')).toBe(0);
    expect(tonDem('lo-that-1', 'cn-1')).toBe(50);
  });

  it('không cho đếm cùng một lô hai lần trong cùng phiếu — rollback toàn bộ', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [{ id: 'tk-nhap', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 100, thoiGian: '2026-09-16T07:00:00.000Z' }]);

    expect(() =>
      taoPhieuKiemKe(db, {
        id: 'pkk-1',
        chiNhanhId: 'cn-1',
        lyDo: 'Kiểm kê định kỳ',
        thoiGian: '2026-09-16T08:00:00.000Z',
        dong: [
          { id: 'pkkd-1', loId, soLuongThucTe: 90 },
          { id: 'pkkd-2', loId, soLuongThucTe: 95 },
        ],
      }),
    ).toThrow();

    // Rollback toàn bộ: tồn không đổi, không dòng thẻ kho KIEM_KE nào được ghi.
    expect(tonDem(loId, 'cn-1')).toBe(100);
    expect(dongTheKhoCuaLo(loId).some((d) => d.loai === 'KIEM_KE')).toBe(false);
  });

  it('chạy cùng kịch bản trên lô ngầm định (chế độ phẳng) và lô thật (chế độ lô) ra cùng số dư cuối', () => {
    taoChiNhanh('cn-1');
    const loPhang = taoSanPhamCoLo('sp-phang', 'SPPHANG');
    const loThat = taoSanPhamCoLo('sp-lo', 'SPLO');

    for (const loId of [loPhang, loThat]) {
      ghiTheKho(db, [{ id: `tk-nhap-${loId}`, chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 200, thoiGian: '2026-09-16T07:00:00.000Z' }]);
    }

    for (const loId of [loPhang, loThat]) {
      taoPhieuKiemKe(db, {
        id: `pkk-${loId}`,
        chiNhanhId: 'cn-1',
        lyDo: 'Kiểm kê định kỳ',
        thoiGian: '2026-09-16T08:00:00.000Z',
        dong: [{ id: `pkkd-${loId}`, loId, soLuongThucTe: 188 }],
      });
    }

    expect(tonDem(loPhang, 'cn-1')).toBe(tonDem(loThat, 'cn-1'));
    expect(tonDem(loPhang, 'cn-1')).toBe(188);
  });
});
