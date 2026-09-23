import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { caiDat, chiNhanh, loHang, sanPham, theKho } from '../db/schema';
import { ghiTheKho } from '../kho/so-cai';
import {
  DoiCheDoBiChanError,
  SanPhamKhongTonTaiError,
  doiCaiDatToanCuc,
  doiGhiDeSanPham,
  layCaiDatToanCuc,
} from './doi-che-do';

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

function taoSanPham(id: string, maHang: string, quanLyLoGhiDe: 'BAT' | 'TAT' | null = null) {
  db.insert(sanPham).values({ id, maHang, ten: 'Paracetamol 500mg', quanLyLoGhiDe }).run();
  const [loNgamDinh] = db.select().from(loHang).where(eq(loHang.sanPhamId, id)).all();
  if (!loNgamDinh) throw new Error('trigger lô ngầm định không chạy');
  return loNgamDinh.id;
}

function taoLoThat(id: string, sanPhamId: string, soLo: string, hsd: string) {
  db.insert(loHang).values({ id, sanPhamId, soLo, hsd }).run();
}

function nhapKho(loId: string, soLuong: number) {
  ghiTheKho(db, [
    { id: `tk-nhap-${loId}`, chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong, thoiGian: '2026-09-20T02:00:00.000Z' },
  ]);
}

function toanCucHienTai(): boolean {
  const [row] = db.select().from(caiDat).all();
  return row?.quanLyLo ?? false;
}

function ghiDeHienTai(sanPhamId: string) {
  const [row] = db.select().from(sanPham).where(eq(sanPham.id, sanPhamId)).all();
  return row?.quanLyLoGhiDe ?? null;
}

function dongDoiCheDoCuaLo(loId: string) {
  return db.select().from(theKho).where(and(eq(theKho.loId, loId), eq(theKho.loai, 'DOI_CHE_DO'))).all();
}

describe('doiGhiDeSanPham', () => {
  it('tắt→bật luôn cho phép, kể cả khi sản phẩm có nhiều lô đang tồn', () => {
    const loNgamDinh = taoSanPham('sp-1', 'SP001', null);
    taoLoThat('lo-1', 'sp-1', 'L001', '2027-01-01');
    taoLoThat('lo-2', 'sp-1', 'L002', '2027-02-01');
    nhapKho('lo-1', 10);
    nhapKho('lo-2', 10);

    doiGhiDeSanPham(db, { sanPhamId: 'sp-1', ghiDeMoi: 'BAT', chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' });

    expect(ghiDeHienTai('sp-1')).toBe('BAT');
    expect(dongDoiCheDoCuaLo(loNgamDinh)).toHaveLength(1);
  });

  it('bật→tắt bị chặn khi sản phẩm còn hơn một lô có tồn > 0 — không đổi gì, không ghi thẻ kho', () => {
    taoSanPham('sp-1', 'SP001', 'BAT');
    taoLoThat('lo-1', 'sp-1', 'L001', '2027-01-01');
    taoLoThat('lo-2', 'sp-1', 'L002', '2027-02-01');
    nhapKho('lo-1', 10);
    nhapKho('lo-2', 10);

    expect(() =>
      doiGhiDeSanPham(db, { sanPhamId: 'sp-1', ghiDeMoi: 'TAT', chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' }),
    ).toThrow(DoiCheDoBiChanError);

    expect(ghiDeHienTai('sp-1')).toBe('BAT');
    expect(dongDoiCheDoCuaLo('lo-1')).toHaveLength(0);
  });

  it('bật→tắt được phép khi sản phẩm có tối đa một lô còn tồn > 0', () => {
    const loNgamDinh = taoSanPham('sp-1', 'SP001', 'BAT');
    taoLoThat('lo-1', 'sp-1', 'L001', '2027-01-01');
    taoLoThat('lo-2', 'sp-1', 'L002', '2027-02-01');
    nhapKho('lo-1', 10);
    nhapKho('lo-2', 10);
    // Bán hết lô 2 — chỉ còn lô-1 có tồn > 0.
    ghiTheKho(db, [{ id: 'tk-ban', chiNhanhId: 'cn-1', loId: 'lo-2', loai: 'BAN', soLuong: -10, thoiGian: '2026-09-20T07:00:00.000Z' }]);

    doiGhiDeSanPham(db, { sanPhamId: 'sp-1', ghiDeMoi: 'TAT', chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' });

    expect(ghiDeHienTai('sp-1')).toBe('TAT');
    const dong = dongDoiCheDoCuaLo(loNgamDinh);
    expect(dong).toHaveLength(1);
    expect(dong[0]?.soLuong).toBe(0);
  });

  it('đổi ghi đè nhưng hiệu lực không đổi thì không ghi thẻ kho (chỉ cập nhật cột)', () => {
    // Toàn cục đang BẬT (mặc định TẮT ban đầu — bật lên trước cho test này).
    db.update(caiDat).set({ quanLyLo: true }).run();
    const loNgamDinh = taoSanPham('sp-1', 'SP001', null); // KE_THUA → hiệu lực BẬT vì toàn cục BẬT

    doiGhiDeSanPham(db, { sanPhamId: 'sp-1', ghiDeMoi: 'BAT', chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' });

    expect(ghiDeHienTai('sp-1')).toBe('BAT');
    expect(dongDoiCheDoCuaLo(loNgamDinh)).toHaveLength(0);
  });

  it('sản phẩm không tồn tại thì ném lỗi rõ ràng', () => {
    expect(() =>
      doiGhiDeSanPham(db, { sanPhamId: 'sp-khong-ton-tai', ghiDeMoi: 'BAT', chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' }),
    ).toThrow(SanPhamKhongTonTaiError);
  });
});

describe('layCaiDatToanCuc', () => {
  it('đọc đúng giá trị mặc định TẮT khi chưa ai đổi', () => {
    expect(layCaiDatToanCuc(db)).toBe(false);
  });

  it('đọc đúng giá trị sau khi đổi toàn cục', () => {
    doiCaiDatToanCuc(db, { bat: true, chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' });

    expect(layCaiDatToanCuc(db)).toBe(true);
  });
});

describe('doiCaiDatToanCuc', () => {
  it('tắt→bật toàn cục luôn cho phép, ghi DOI_CHE_DO cho từng sản phẩm kế thừa bị ảnh hưởng', () => {
    const loA = taoSanPham('sp-a', 'SPA', null);
    const loB = taoSanPham('sp-b', 'SPB', null);
    taoLoThat('lo-a-2', 'sp-a', 'L001', '2027-01-01');
    nhapKho(loA, 5);
    nhapKho('lo-a-2', 5);
    nhapKho(loB, 5);

    doiCaiDatToanCuc(db, { bat: true, chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' });

    expect(toanCucHienTai()).toBe(true);
    expect(dongDoiCheDoCuaLo(loA)).toHaveLength(1);
    expect(dongDoiCheDoCuaLo(loB)).toHaveLength(1);
  });

  it('bật→tắt toàn cục bị chặn nếu một sản phẩm kế thừa còn hơn một lô có tồn > 0 — rollback toàn bộ', () => {
    db.update(caiDat).set({ quanLyLo: true }).run();
    const loA = taoSanPham('sp-a', 'SPA', null);
    taoLoThat('lo-a-2', 'sp-a', 'L001', '2027-01-01');
    nhapKho(loA, 5);
    nhapKho('lo-a-2', 5);

    expect(() => doiCaiDatToanCuc(db, { bat: false, chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' })).toThrow(
      DoiCheDoBiChanError,
    );

    expect(toanCucHienTai()).toBe(true);
    expect(dongDoiCheDoCuaLo(loA)).toHaveLength(0);
  });

  it('bật→tắt toàn cục thành công khi mọi sản phẩm kế thừa đều tối đa một lô còn tồn > 0', () => {
    db.update(caiDat).set({ quanLyLo: true }).run();
    const loA = taoSanPham('sp-a', 'SPA', null);
    nhapKho(loA, 5);

    doiCaiDatToanCuc(db, { bat: false, chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' });

    expect(toanCucHienTai()).toBe(false);
    expect(dongDoiCheDoCuaLo(loA)).toHaveLength(1);
  });

  it('sản phẩm có ghi đè riêng không bị ảnh hưởng và không nhận thẻ kho khi đổi toàn cục', () => {
    db.update(caiDat).set({ quanLyLo: true }).run();
    const loGhiDeTat = taoSanPham('sp-ghi-de', 'SPGHIDE', 'TAT');
    const loKeThua = taoSanPham('sp-ke-thua', 'SPKETHUA', null);
    nhapKho(loGhiDeTat, 5);
    nhapKho(loKeThua, 5);

    doiCaiDatToanCuc(db, { bat: false, chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' });

    expect(dongDoiCheDoCuaLo(loGhiDeTat)).toHaveLength(0);
    expect(dongDoiCheDoCuaLo(loKeThua)).toHaveLength(1);
  });

  it('đổi toàn cục về đúng giá trị hiện tại là no-op — không ghi thẻ kho nào', () => {
    const loA = taoSanPham('sp-a', 'SPA', null);
    nhapKho(loA, 5);

    doiCaiDatToanCuc(db, { bat: false, chiNhanhId: 'cn-1', thoiGian: '2026-09-20T08:00:00.000Z' });

    expect(toanCucHienTai()).toBe(false);
    expect(dongDoiCheDoCuaLo(loA)).toHaveLength(0);
  });
});
