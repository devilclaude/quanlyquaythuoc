import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ThaoTacBanHangOffline } from '../../shared/hop-dong/dong-bo';
import { apDungLoThaoTac } from '../dong-bo/ap-dung-thao-tac';
import { layChiNhanhMacDinh } from '../db/chi-nhanh';
import { loHang, sanPham } from '../db/schema';
import { ghiTheKho } from './so-cai';
import { layCanhBaoLechKho } from './canh-bao-lech-kho';

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

function taoSanPhamCoLo(sanPhamId: string, maHang: string, ten: string): string {
  db.insert(sanPham).values({ id: sanPhamId, maHang, ten }).run();
  const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  return lo.id;
}

function nhapKho(loId: string, chiNhanhId: string, soLuong: number, thoiGian: string) {
  ghiTheKho(db, [{ id: `nhap-${loId}-${thoiGian}`, chiNhanhId, loId, loai: 'NHAP', soLuong, thoiGian }]);
}

function thaoTacBanMau(overrides: Partial<ThaoTacBanHangOffline> = {}): ThaoTacBanHangOffline {
  return {
    loai: 'BAN_HANG',
    id: overrides.id ?? 'tt-1',
    maHoaDon: overrides.maHoaDon ?? 'HDABC123-000001',
    thoiGian: overrides.thoiGian ?? '2026-09-25T08:00:00.000Z',
    phuongThucThanhToan: overrides.phuongThucThanhToan ?? 'TIEN_MAT',
    dong: overrides.dong ?? [{ sanPhamId: 'sp-1', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 1 }],
  };
}

describe('layCanhBaoLechKho', () => {
  it('lô còn tồn dương hoặc đúng 0 thì không phải cảnh báo', () => {
    const loId = taoSanPhamCoLo('sp-1', 'SP001', 'Paracetamol 500mg');
    nhapKho(loId, layChiNhanhMacDinh(db), 10, '2026-09-25T07:00:00.000Z');

    expect(layCanhBaoLechKho(db)).toEqual([]);
  });

  it('lô tồn âm thì xuất hiện trong cảnh báo kèm đủ thông tin để đi kiểm kê', () => {
    const loId = taoSanPhamCoLo('sp-2', 'SP002', 'Amoxicillin 500mg');
    const chiNhanhId = layChiNhanhMacDinh(db);
    nhapKho(loId, chiNhanhId, 2, '2026-09-25T07:00:00.000Z');
    ghiTheKho(db, [
      { id: 'ban-1', chiNhanhId, loId, loai: 'BAN', soLuong: -5, thoiGian: '2026-09-25T08:00:00.000Z' },
    ]);

    expect(layCanhBaoLechKho(db)).toEqual([
      {
        loId,
        chiNhanhId,
        sanPhamId: 'sp-2',
        maHang: 'SP002',
        tenSanPham: 'Amoxicillin 500mg',
        soLo: null,
        hsd: null,
        ton: -3,
      },
    ]);
  });

  it('sinh cảnh báo khi hai thiết bị cùng bán hộp cuối lúc offline (SPEC.md §4.4/§5.4) — máy chủ vẫn nhận cả hai, không tự sửa, không im lặng', () => {
    const loId = taoSanPhamCoLo('sp-3', 'SP003', 'Vitamin C 500mg');
    nhapKho(loId, layChiNhanhMacDinh(db), 1, '2026-09-25T07:00:00.000Z');

    // Hai thiết bị cùng bán "hộp cuối" khi mất mạng, cả hai đơn đến máy chủ độc
    // lập (ULID khác nhau) — SPEC.md §5.4 "hai máy cùng bán hộp cuối: nhận cả
    // hai, sinh cảnh báo lệch kho".
    const dongBanSp3 = [{ sanPhamId: 'sp-3', donViTen: 'Viên', heSo: 1, donGia: 1_000, soLuong: 1 }];
    const ketQua = apDungLoThaoTac(db, [
      thaoTacBanMau({ id: 'tt-may-1', maHoaDon: 'HD1-000001', dong: dongBanSp3 }),
      thaoTacBanMau({ id: 'tt-may-2', maHoaDon: 'HD2-000001', dong: dongBanSp3 }),
    ]);

    expect(ketQua).toEqual([
      { id: 'tt-may-1', ketQua: 'DA_AP_DUNG' },
      { id: 'tt-may-2', ketQua: 'DA_AP_DUNG' },
    ]);

    const canhBao = layCanhBaoLechKho(db);
    expect(canhBao).toHaveLength(1);
    expect(canhBao[0]).toMatchObject({ loId, sanPhamId: 'sp-3', maHang: 'SP003', ton: -1 });
  });

  it('kiểm kê đưa tồn hết âm thì cảnh báo tự biến mất — không cần trạng thái "đã xử lý" riêng', () => {
    const loId = taoSanPhamCoLo('sp-4', 'SP004', 'Cefixim 200mg');
    const chiNhanhId = layChiNhanhMacDinh(db);
    ghiTheKho(db, [
      { id: 'ban-1', chiNhanhId, loId, loai: 'BAN', soLuong: -2, thoiGian: '2026-09-25T08:00:00.000Z' },
    ]);
    expect(layCanhBaoLechKho(db)).toHaveLength(1);

    // Kiểm kê (T-050) ghi một dòng điều chỉnh đưa tồn về đúng thực tế.
    ghiTheKho(db, [
      { id: 'kk-1', chiNhanhId, loId, loai: 'KIEM_KE', soLuong: 2, thoiGian: '2026-09-25T09:00:00.000Z' },
    ]);

    expect(layCanhBaoLechKho(db)).toEqual([]);
  });
});
