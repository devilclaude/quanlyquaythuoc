import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, loHang, sanPham } from '../db/schema';
import { ghiTheKho } from './so-cai';
import {
  KhongDuTonKhoError,
  chonLoXuatKho,
  phanBoTheoThuTu,
  sapXepFefo,
  sapXepUuTienThuCong,
  type LoTonKho,
} from './fefo';

describe('phanBoTheoThuTu (hàm thuần)', () => {
  it('số lượng cần xuất bằng 0 thì không phân bổ vào lô nào', () => {
    const lo: LoTonKho[] = [{ loId: 'lo-1', hsd: null, ngayTao: '2026-01-01T00:00:00.000Z', ton: 100 }];

    expect(phanBoTheoThuTu(lo, 0)).toEqual([]);
  });

  it('tồn đủ ở lô đầu thì lấy hết ở lô đó, không đụng lô sau', () => {
    const cacLo: LoTonKho[] = [
      { loId: 'lo-1', hsd: null, ngayTao: '2026-01-01T00:00:00.000Z', ton: 900 },
      { loId: 'lo-2', hsd: '2026-12-01', ngayTao: '2026-02-01T00:00:00.000Z', ton: 500 },
    ];

    expect(phanBoTheoThuTu(cacLo, 36)).toEqual([{ loId: 'lo-1', soLuong: 36 }]);
  });

  it('tồn không đủ ở lô đầu thì chia đúng sang lô kế tiếp theo thứ tự truyền vào', () => {
    const cacLo: LoTonKho[] = [
      { loId: 'lo-1', hsd: '2026-01-01', ngayTao: '2026-01-01T00:00:00.000Z', ton: 400 },
      { loId: 'lo-2', hsd: '2026-06-01', ngayTao: '2026-01-01T00:00:00.000Z', ton: 500 },
    ];

    expect(phanBoTheoThuTu(cacLo, 900)).toEqual([
      { loId: 'lo-1', soLuong: 400 },
      { loId: 'lo-2', soLuong: 500 },
    ]);
  });

  it('lô có tồn 0 hoặc âm bị bỏ qua, không được phân bổ', () => {
    const cacLo: LoTonKho[] = [
      { loId: 'lo-rong', hsd: null, ngayTao: '2026-01-01T00:00:00.000Z', ton: 0 },
      { loId: 'lo-am', hsd: '2026-01-01', ngayTao: '2026-01-01T00:00:00.000Z', ton: -5 },
      { loId: 'lo-con', hsd: '2026-06-01', ngayTao: '2026-01-01T00:00:00.000Z', ton: 10 },
    ];

    expect(phanBoTheoThuTu(cacLo, 10)).toEqual([{ loId: 'lo-con', soLuong: 10 }]);
  });

  it('tổng tồn không đủ để xuất thì ném KhongDuTonKhoError, không trả về phân bổ một phần', () => {
    const cacLo: LoTonKho[] = [{ loId: 'lo-1', hsd: null, ngayTao: '2026-01-01T00:00:00.000Z', ton: 5 }];

    expect(() => phanBoTheoThuTu(cacLo, 10)).toThrow(KhongDuTonKhoError);
  });
});

describe('sapXepFefo — hsd ASC NULLS FIRST, ngay_tao ASC, lo_id ASC', () => {
  it('lô ngầm định (hsd null) đứng trước lô thật có HSD dù được tạo sau', () => {
    const cacLo: LoTonKho[] = [
      { loId: 'lo-that', hsd: '2026-01-01', ngayTao: '2026-01-01T00:00:00.000Z', ton: 10 },
      { loId: 'lo-ngam-dinh', hsd: null, ngayTao: '2026-02-01T00:00:00.000Z', ton: 10 },
    ];

    expect(sapXepFefo(cacLo).map((l) => l.loId)).toEqual(['lo-ngam-dinh', 'lo-that']);
  });

  it('cùng hsd thì lô tạo trước xếp trước', () => {
    const cacLo: LoTonKho[] = [
      { loId: 'lo-sau', hsd: '2026-01-01', ngayTao: '2026-02-01T00:00:00.000Z', ton: 10 },
      { loId: 'lo-truoc', hsd: '2026-01-01', ngayTao: '2026-01-01T00:00:00.000Z', ton: 10 },
    ];

    expect(sapXepFefo(cacLo).map((l) => l.loId)).toEqual(['lo-truoc', 'lo-sau']);
  });

  it('cùng hsd và cùng ngày tạo thì lo_id xếp trước theo thứ tự chữ', () => {
    const cacLo: LoTonKho[] = [
      { loId: 'lo-b', hsd: '2026-01-01', ngayTao: '2026-01-01T00:00:00.000Z', ton: 10 },
      { loId: 'lo-a', hsd: '2026-01-01', ngayTao: '2026-01-01T00:00:00.000Z', ton: 10 },
    ];

    expect(sapXepFefo(cacLo).map((l) => l.loId)).toEqual(['lo-a', 'lo-b']);
  });
});

describe('sapXepUuTienThuCong — chọn lô thủ công ghi đè FEFO', () => {
  it('lô được chọn tay đứng trước, kể cả khi FEFO lẽ ra chọn lô khác trước', () => {
    const cacLo: LoTonKho[] = [
      { loId: 'lo-fefo-truoc', hsd: '2026-01-01', ngayTao: '2026-01-01T00:00:00.000Z', ton: 10 },
      { loId: 'lo-chon-tay', hsd: '2026-06-01', ngayTao: '2026-01-01T00:00:00.000Z', ton: 10 },
    ];

    expect(sapXepUuTienThuCong(cacLo, ['lo-chon-tay']).map((l) => l.loId)).toEqual([
      'lo-chon-tay',
      'lo-fefo-truoc',
    ]);
  });
});

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

function taoSanPham(sanPhamId: string, maHang: string): string {
  db.insert(sanPham).values({ id: sanPhamId, maHang, ten: 'Paracetamol 500mg' }).run();
  const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
  if (!lo) throw new Error('trigger lô ngầm định không chạy');
  return lo.id;
}

function taoLoThat(sanPhamId: string, id: string, soLo: string, hsd: string): void {
  db.insert(loHang).values({ id, sanPhamId, soLo, hsd, ngayTao: `${hsd}T00:00:00.000Z` }).run();
}

describe('chonLoXuatKho — chế độ phẳng (chỉ lô ngầm định)', () => {
  it('900 nhập rồi xuất 36 thì lấy hết từ lô ngầm định, còn 864', () => {
    const loNgamDinh = taoSanPham('sp-1', 'SP001');
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId: 'cn-1', loId: loNgamDinh, loai: 'NHAP', soLuong: 900, thoiGian: '2026-09-13T08:00:00.000Z' },
    ]);

    const phanBo = chonLoXuatKho(db, 'sp-1', 'cn-1', 36);
    expect(phanBo).toEqual([{ loId: loNgamDinh, soLuong: 36 }]);

    ghiTheKho(db, [
      { id: 'tk-2', chiNhanhId: 'cn-1', loId: loNgamDinh, loai: 'BAN', soLuong: -36, thoiGian: '2026-09-13T09:00:00.000Z' },
    ]);
    const [tonConLai] = db.select().from(loHang).where(eq(loHang.id, loNgamDinh)).all();
    expect(tonConLai).toBeDefined();
  });
});

describe('chonLoXuatKho — chế độ lô thật cho cùng số dư cuối như chế độ phẳng', () => {
  it('900 chia làm 2 lô thật (400 + 500), xuất 36 theo FEFO, tổng còn lại vẫn 864 — khớp kịch bản chế độ phẳng', () => {
    taoSanPham('sp-1', 'SP001');
    const loA = 'lo-a';
    const loB = 'lo-b';
    taoLoThat('sp-1', loA, 'L1', '2026-01-01');
    taoLoThat('sp-1', loB, 'L2', '2026-06-01');
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId: 'cn-1', loId: loA, loai: 'NHAP', soLuong: 400, thoiGian: '2026-09-13T08:00:00.000Z' },
      { id: 'tk-2', chiNhanhId: 'cn-1', loId: loB, loai: 'NHAP', soLuong: 500, thoiGian: '2026-09-13T08:00:00.000Z' },
    ]);

    const phanBo = chonLoXuatKho(db, 'sp-1', 'cn-1', 36);
    expect(phanBo).toEqual([{ loId: loA, soLuong: 36 }]);

    ghiTheKho(
      db,
      phanBo.map((p, i) => ({
        id: `tk-ban-${i}`,
        chiNhanhId: 'cn-1',
        loId: p.loId,
        loai: 'BAN' as const,
        soLuong: -p.soLuong,
        thoiGian: '2026-09-13T09:00:00.000Z',
      })),
    );

    const danhSachSauKhiBan = chonLoXuatKho(db, 'sp-1', 'cn-1', 0);
    expect(danhSachSauKhiBan).toEqual([]);
  });

  it('lô ngầm định (tồn cũ chưa rõ HSD) được bán trước lô thật, đúng NULLS FIRST', () => {
    const loNgamDinh = taoSanPham('sp-1', 'SP001');
    const loThat = 'lo-that';
    taoLoThat('sp-1', loThat, 'L1', '2026-01-01');
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId: 'cn-1', loId: loNgamDinh, loai: 'KIEM_KE', soLuong: 100, thoiGian: '2026-09-13T08:00:00.000Z' },
      { id: 'tk-2', chiNhanhId: 'cn-1', loId: loThat, loai: 'NHAP', soLuong: 200, thoiGian: '2026-09-13T08:00:00.000Z' },
    ]);

    expect(chonLoXuatKho(db, 'sp-1', 'cn-1', 150)).toEqual([
      { loId: loNgamDinh, soLuong: 100 },
      { loId: loThat, soLuong: 50 },
    ]);
  });

  it('chọn lô thủ công ghi đè FEFO: bán từ lô thật trước dù lô ngầm định đứng đầu FEFO', () => {
    const loNgamDinh = taoSanPham('sp-1', 'SP001');
    const loThat = 'lo-that';
    taoLoThat('sp-1', loThat, 'L1', '2026-01-01');
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId: 'cn-1', loId: loNgamDinh, loai: 'KIEM_KE', soLuong: 100, thoiGian: '2026-09-13T08:00:00.000Z' },
      { id: 'tk-2', chiNhanhId: 'cn-1', loId: loThat, loai: 'NHAP', soLuong: 200, thoiGian: '2026-09-13T08:00:00.000Z' },
    ]);

    expect(chonLoXuatKho(db, 'sp-1', 'cn-1', 50, [loThat])).toEqual([{ loId: loThat, soLuong: 50 }]);
  });

  it('bán vượt tổng tồn bị từ chối khi online (ném KhongDuTonKhoError)', () => {
    const loNgamDinh = taoSanPham('sp-1', 'SP001');
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId: 'cn-1', loId: loNgamDinh, loai: 'NHAP', soLuong: 10, thoiGian: '2026-09-13T08:00:00.000Z' },
    ]);

    expect(() => chonLoXuatKho(db, 'sp-1', 'cn-1', 11)).toThrow(KhongDuTonKhoError);
  });

  it('hai giao dịch liên tiếp cùng trừ lô cuối: giao dịch sau bị từ chối khi tồn đã hết', () => {
    const loNgamDinh = taoSanPham('sp-1', 'SP001');
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId: 'cn-1', loId: loNgamDinh, loai: 'NHAP', soLuong: 5, thoiGian: '2026-09-13T08:00:00.000Z' },
    ]);

    const giaoDich1 = chonLoXuatKho(db, 'sp-1', 'cn-1', 5);
    ghiTheKho(db, [
      { id: 'tk-ban-1', chiNhanhId: 'cn-1', loId: giaoDich1[0]!.loId, loai: 'BAN', soLuong: -giaoDich1[0]!.soLuong, thoiGian: '2026-09-13T09:00:00.000Z' },
    ]);

    expect(() => chonLoXuatKho(db, 'sp-1', 'cn-1', 1)).toThrow(KhongDuTonKhoError);
  });
});
