import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { layChiNhanhMacDinh } from '../db/chi-nhanh';
import { loHang, sanPham } from '../db/schema';
import { ghiTheKho } from './so-cai';
import { layCanhBaoCanDate } from './canh-bao-can-date';

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

function taoSanPham(sanPhamId: string, maHang: string, ten: string, ghiDe: 'BAT' | 'TAT' | null = null): void {
  db.insert(sanPham).values({ id: sanPhamId, maHang, ten, quanLyLoGhiDe: ghiDe }).run();
}

function layLoNgamDinh(sanPhamId: string): string {
  const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  return lo.id;
}

/** Get-or-create một lô THẬT (có số lô + HSD) — khuôn `layHoacTaoLoThat` của T-040a, viết lại tối giản cho test. */
function taoLoThat(sanPhamId: string, soLo: string, hsd: string): string {
  const id = `${sanPhamId}-${soLo}`;
  db.insert(loHang).values({ id, sanPhamId, soLo, hsd }).run();
  return id;
}

function nhapKho(loId: string, chiNhanhId: string, soLuong: number, thoiGian: string): void {
  ghiTheKho(db, [{ id: `nhap-${loId}-${thoiGian}`, chiNhanhId, loId, loai: 'NHAP', soLuong, thoiGian }]);
}

describe('layCanhBaoCanDate', () => {
  it('chỉ có lô ngầm định (chưa dùng lô thật) thì báo cáo rỗng — đúng, không phải bug (BACKLOG.md T-055)', () => {
    taoSanPham('sp-1', 'SP001', 'Paracetamol 500mg');
    const loId = layLoNgamDinh('sp-1');
    nhapKho(loId, layChiNhanhMacDinh(db), 100, '2026-09-25T07:00:00.000Z');

    expect(layCanhBaoCanDate(db, new Date('2026-10-03T00:00:00.000Z'))).toEqual([]);
  });

  it('lô thật còn tồn > 0, HSD trong 90 ngày tới thì xuất hiện kèm số ngày còn lại và ngưỡng', () => {
    taoSanPham('sp-2', 'SP002', 'Amoxicillin 500mg');
    const chiNhanhId = layChiNhanhMacDinh(db);
    const loId = taoLoThat('sp-2', 'L01', '2026-10-15');
    nhapKho(loId, chiNhanhId, 10, '2026-09-25T07:00:00.000Z');

    expect(layCanhBaoCanDate(db, new Date('2026-10-03T00:00:00.000Z'))).toEqual([
      {
        loId,
        chiNhanhId,
        sanPhamId: 'sp-2',
        maHang: 'SP002',
        tenSanPham: 'Amoxicillin 500mg',
        soLo: 'L01',
        hsd: '2026-10-15',
        soNgayConLai: 12,
        nguong: 30,
        ton: 10,
        // Dữ liệu thô — không tự lọc theo cài đặt quản lý lô ở tầng kho (SPEC.md
        // §3.2: hàm giải nghĩa chỉ được gọi ở tầng API/UI, không trong `kho/**`).
        quanLyLoGhiDe: null,
      },
    ]);
  });

  it('HSD còn hơn 90 ngày thì KHÔNG xuất hiện trong báo cáo', () => {
    taoSanPham('sp-3', 'SP003', 'Vitamin C 500mg');
    const chiNhanhId = layChiNhanhMacDinh(db);
    const loId = taoLoThat('sp-3', 'L01', '2027-02-01'); // ~121 ngày sau mốc test
    nhapKho(loId, chiNhanhId, 5, '2026-09-25T07:00:00.000Z');

    expect(layCanhBaoCanDate(db, new Date('2026-10-03T00:00:00.000Z'))).toEqual([]);
  });

  it('lô đã hết hạn (HSD ở quá khứ) vẫn xuất hiện, ở ngưỡng cấp bách nhất (30), số ngày còn lại âm', () => {
    taoSanPham('sp-4', 'SP004', 'Cefixim 200mg');
    const chiNhanhId = layChiNhanhMacDinh(db);
    const loId = taoLoThat('sp-4', 'L01', '2026-09-01');
    nhapKho(loId, chiNhanhId, 3, '2026-08-25T07:00:00.000Z');

    const canhBao = layCanhBaoCanDate(db, new Date('2026-10-03T00:00:00.000Z'));
    expect(canhBao).toHaveLength(1);
    expect(canhBao[0]).toMatchObject({ loId, soNgayConLai: -32, nguong: 30 });
  });

  it('lô thật đã bán hết (tồn = 0) thì KHÔNG xuất hiện — không còn hàng để cảnh báo', () => {
    taoSanPham('sp-5', 'SP005', 'Loratadin 10mg');
    const chiNhanhId = layChiNhanhMacDinh(db);
    const loId = taoLoThat('sp-5', 'L01', '2026-10-10');
    nhapKho(loId, chiNhanhId, 2, '2026-09-25T07:00:00.000Z');
    ghiTheKho(db, [
      { id: 'ban-1', chiNhanhId, loId, loai: 'BAN', soLuong: -2, thoiGian: '2026-09-26T07:00:00.000Z' },
    ]);

    expect(layCanhBaoCanDate(db, new Date('2026-10-03T00:00:00.000Z'))).toEqual([]);
  });

  it('ba ngưỡng 30/60/90 ngày phân loại đúng theo số ngày còn lại', () => {
    taoSanPham('sp-6', 'SP006', 'A — còn 25 ngày');
    taoSanPham('sp-7', 'SP007', 'B — còn 55 ngày');
    taoSanPham('sp-8', 'SP008', 'C — còn 85 ngày');
    const chiNhanhId = layChiNhanhMacDinh(db);
    const lo6 = taoLoThat('sp-6', 'L01', '2026-10-28'); // +25
    const lo7 = taoLoThat('sp-7', 'L01', '2026-11-27'); // +55
    const lo8 = taoLoThat('sp-8', 'L01', '2026-12-27'); // +85
    nhapKho(lo6, chiNhanhId, 1, '2026-09-25T07:00:00.000Z');
    nhapKho(lo7, chiNhanhId, 1, '2026-09-25T07:00:00.000Z');
    nhapKho(lo8, chiNhanhId, 1, '2026-09-25T07:00:00.000Z');

    const canhBao = layCanhBaoCanDate(db, new Date('2026-10-03T00:00:00.000Z'));
    expect(canhBao.map((c) => [c.sanPhamId, c.nguong])).toEqual([
      ['sp-6', 30],
      ['sp-7', 60],
      ['sp-8', 90],
    ]);
  });

  it('sắp xếp theo số ngày còn lại tăng dần (gấp nhất lên trước)', () => {
    taoSanPham('sp-9', 'SP009', 'Xa hơn');
    taoSanPham('sp-10', 'SP010', 'Gần hơn');
    const chiNhanhId = layChiNhanhMacDinh(db);
    const loXa = taoLoThat('sp-9', 'L01', '2026-12-01');
    const loGan = taoLoThat('sp-10', 'L01', '2026-10-10');
    nhapKho(loXa, chiNhanhId, 1, '2026-09-25T07:00:00.000Z');
    nhapKho(loGan, chiNhanhId, 1, '2026-09-25T07:00:00.000Z');

    const canhBao = layCanhBaoCanDate(db, new Date('2026-10-03T00:00:00.000Z'));
    expect(canhBao.map((c) => c.sanPhamId)).toEqual(['sp-10', 'sp-9']);
  });
});
