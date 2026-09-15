import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, loHang, sanPham, theKho, tonKhoLo } from '../db/schema';
import { dungLaiTonKhoDem, ghiTheKho, type DongTheKho } from './so-cai';

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

function tonDem(loId: string, chiNhanhId: string): number | undefined {
  const [row] = db
    .select()
    .from(tonKhoLo)
    .where(and(eq(tonKhoLo.loId, loId), eq(tonKhoLo.chiNhanhId, chiNhanhId)))
    .all();
  return row?.ton;
}

function tonVaGiaTriDem(loId: string, chiNhanhId: string): { ton: number; giaTriTon: number } | undefined {
  const [row] = db
    .select()
    .from(tonKhoLo)
    .where(and(eq(tonKhoLo.loId, loId), eq(tonKhoLo.chiNhanhId, chiNhanhId)))
    .all();
  return row ? { ton: row.ton, giaTriTon: row.giaTriTon } : undefined;
}

describe('ghiTheKho', () => {
  it('ghi một dòng vào lô chưa có tồn đệm thì tạo mới bản đệm đúng bằng số lượng ghi', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 900, thoiGian: '2026-09-13T08:00:00.000Z' },
    ]);

    expect(tonDem(loId, 'cn-1')).toBe(900);
  });

  it('ghi dòng thứ hai cộng dồn vào bản đệm đã có (nhập rồi bán)', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 900, thoiGian: '2026-09-13T08:00:00.000Z' },
    ]);
    ghiTheKho(db, [
      { id: 'tk-2', chiNhanhId: 'cn-1', loId, loai: 'BAN', soLuong: -36, thoiGian: '2026-09-13T09:00:00.000Z' },
    ]);

    expect(tonDem(loId, 'cn-1')).toBe(864);
  });

  it('ghi nhiều dòng khác lô trong một lần gọi cập nhật đúng bản đệm cho từng lô', () => {
    taoChiNhanh('cn-1');
    const loA = taoSanPhamCoLo('sp-a', 'SPA');
    const loB = taoSanPhamCoLo('sp-b', 'SPB');
    const dong: DongTheKho[] = [
      { id: 'tk-a', chiNhanhId: 'cn-1', loId: loA, loai: 'NHAP', soLuong: 100, thoiGian: '2026-09-13T08:00:00.000Z' },
      { id: 'tk-b', chiNhanhId: 'cn-1', loId: loB, loai: 'NHAP', soLuong: 200, thoiGian: '2026-09-13T08:00:00.000Z' },
    ];

    ghiTheKho(db, dong);

    expect(tonDem(loA, 'cn-1')).toBe(100);
    expect(tonDem(loB, 'cn-1')).toBe(200);
  });

  it('nhiều dòng trong một lần gọi là một giao dịch nguyên tử — một dòng lỗi thì không dòng nào được ghi', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    expect(() =>
      ghiTheKho(db, [
        {
          id: 'tk-hop-le',
          chiNhanhId: 'cn-1',
          loId,
          loai: 'NHAP',
          soLuong: 900,
          thoiGian: '2026-09-13T08:00:00.000Z',
        },
        {
          id: 'tk-loi',
          chiNhanhId: 'cn-1',
          loId,
          // @ts-expect-error — cố tình dùng loai không hợp lệ để kiểm tra rollback
          loai: 'KHONG_HOP_LE',
          soLuong: 10,
          thoiGian: '2026-09-13T08:00:00.000Z',
        },
      ]),
    ).toThrow();

    const dongTheKho = db.select().from(theKho).all();
    expect(dongTheKho).toHaveLength(0);
    expect(tonDem(loId, 'cn-1')).toBeUndefined();
  });

  it('gọi với danh sách rỗng không làm gì', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    expect(() => ghiTheKho(db, [])).not.toThrow();
    expect(tonDem(loId, 'cn-1')).toBeUndefined();
  });
});

describe('bất biến sổ cái == bản đệm', () => {
  it('tổng thẻ kho theo (lo_id, chi_nhanh_id) luôn khớp bản đệm sau một dãy ghi ngẫu nhiên', () => {
    taoChiNhanh('cn-1');
    taoChiNhanh('cn-2');
    const cacLo = [
      taoSanPhamCoLo('sp-1', 'SP001'),
      taoSanPhamCoLo('sp-2', 'SP002'),
      taoSanPhamCoLo('sp-3', 'SP003'),
    ];
    const cacChiNhanh = ['cn-1', 'cn-2'];
    const cacLoai: DongTheKho['loai'][] = ['NHAP', 'BAN', 'TRA_HANG', 'KIEM_KE', 'XUAT_HUY'];

    // Hạt giống cố định để test tất định — không phải test bất biến ngẫu nhiên
    // theo nghĩa fuzzing không lặp lại được, mà là kiểm bất biến trên một tập dữ
    // liệu đa dạng, phủ nhiều tổ hợp lô/chi nhánh/loại một cách có kiểm soát.
    // Dùng modulo thay vì chia trần để không vướng luật cấm `/` ở src/server/kho/**.
    let hatGiong = 42;
    function ngauNhienDuoi(gioiHan: number): number {
      hatGiong = (hatGiong * 1103515245 + 12345) & 0x7fffffff;
      return hatGiong % gioiHan;
    }

    for (let i = 0; i < 200; i++) {
      const loId = cacLo[ngauNhienDuoi(cacLo.length)] ?? cacLo[0]!;
      const chiNhanhId = cacChiNhanh[ngauNhienDuoi(cacChiNhanh.length)] ?? cacChiNhanh[0]!;
      const loai = cacLoai[ngauNhienDuoi(cacLoai.length)] ?? cacLoai[0]!;
      const soLuong = ngauNhienDuoi(21) - 10; // -10..10, có thể là 0

      ghiTheKho(db, [{ id: `tk-${i}`, chiNhanhId, loId, loai, soLuong, thoiGian: '2026-09-13T08:00:00.000Z' }]);
    }

    for (const loId of cacLo) {
      for (const chiNhanhId of cacChiNhanh) {
        const dongTheKho = db
          .select()
          .from(theKho)
          .where(and(eq(theKho.loId, loId), eq(theKho.chiNhanhId, chiNhanhId)))
          .all();
        const tongSoCai = dongTheKho.reduce((tong, d) => tong + d.soLuong, 0);

        expect(tonDem(loId, chiNhanhId) ?? 0).toBe(tongSoCai);
      }
    }
  });
});

describe('ghiTheKho — giá vốn bình quân gia quyền (T-007)', () => {
  it('nhập có khai tổng tiền thì giá trị tồn tăng đúng bằng tổng tiền, không qua phép chia', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    ghiTheKho(db, [
      {
        id: 'tk-1',
        chiNhanhId: 'cn-1',
        loId,
        loai: 'NHAP',
        soLuong: 900,
        giaTri: 4_500_000,
        thoiGian: '2026-09-15T08:00:00.000Z',
      },
    ]);

    expect(tonVaGiaTriDem(loId, 'cn-1')).toEqual({ ton: 900, giaTriTon: 4_500_000 });
  });

  it('bán một phần trừ đúng COGS bình quân gia quyền làm tròn nửa lên khỏi giá trị tồn', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    ghiTheKho(db, [
      {
        id: 'tk-1',
        chiNhanhId: 'cn-1',
        loId,
        loai: 'NHAP',
        soLuong: 1000,
        giaTri: 5_100_000,
        thoiGian: '2026-09-15T08:00:00.000Z',
      },
    ]);
    ghiTheKho(db, [
      { id: 'tk-2', chiNhanhId: 'cn-1', loId, loai: 'BAN', soLuong: -3, thoiGian: '2026-09-15T09:00:00.000Z' },
    ]);

    expect(tonVaGiaTriDem(loId, 'cn-1')).toEqual({ ton: 997, giaTriTon: 5_084_700 });
  });

  it('bán hết sạch một lô thì giá trị tồn về đúng 0 — không tích luỹ sai số làm tròn', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    ghiTheKho(db, [
      {
        id: 'tk-1',
        chiNhanhId: 'cn-1',
        loId,
        loai: 'NHAP',
        soLuong: 7,
        giaTri: 100_000,
        thoiGian: '2026-09-15T08:00:00.000Z',
      },
    ]);
    ghiTheKho(db, [
      { id: 'tk-2', chiNhanhId: 'cn-1', loId, loai: 'BAN', soLuong: -7, thoiGian: '2026-09-15T09:00:00.000Z' },
    ]);

    expect(tonVaGiaTriDem(loId, 'cn-1')).toEqual({ ton: 0, giaTriTon: 0 });
  });

  it('cùng kịch bản nhập rồi bán một phần cho ra cùng giá trị tồn cuối trên lô ngầm định và lô thật', () => {
    taoChiNhanh('cn-1');
    const loPhang = taoSanPhamCoLo('sp-phang', 'SPPHANG');
    db.insert(sanPham).values({ id: 'sp-lo', maHang: 'SPLO', ten: 'Paracetamol 500mg' }).run();
    const loThat = 'lo-that-1';
    db.insert(loHang).values({ id: loThat, sanPhamId: 'sp-lo', soLo: 'L1', hsd: '2027-01-01' }).run();

    for (const loId of [loPhang, loThat]) {
      ghiTheKho(db, [
        {
          id: `tk-nhap-${loId}`,
          chiNhanhId: 'cn-1',
          loId,
          loai: 'NHAP',
          soLuong: 180,
          giaTri: 900_000,
          thoiGian: '2026-09-15T08:00:00.000Z',
        },
      ]);
      ghiTheKho(db, [
        { id: `tk-ban-${loId}`, chiNhanhId: 'cn-1', loId, loai: 'BAN', soLuong: -36, thoiGian: '2026-09-15T09:00:00.000Z' },
      ]);
    }

    expect(tonVaGiaTriDem(loPhang, 'cn-1')).toEqual(tonVaGiaTriDem(loThat, 'cn-1'));
  });
});

describe('dungLaiTonKhoDem', () => {
  it('dựng lại bản đệm từ sổ cái ra đúng bằng bản đệm đã có (không cần ghi tăng dần)', () => {
    taoChiNhanh('cn-1');
    taoChiNhanh('cn-2');
    const loA = taoSanPhamCoLo('sp-a', 'SPA');
    const loB = taoSanPhamCoLo('sp-b', 'SPB');

    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId: 'cn-1', loId: loA, loai: 'NHAP', soLuong: 900, thoiGian: '2026-09-13T08:00:00.000Z' },
      { id: 'tk-2', chiNhanhId: 'cn-1', loId: loA, loai: 'BAN', soLuong: -36, thoiGian: '2026-09-13T09:00:00.000Z' },
      { id: 'tk-3', chiNhanhId: 'cn-2', loId: loB, loai: 'NHAP', soLuong: 50, thoiGian: '2026-09-13T08:00:00.000Z' },
    ]);

    const truocKhiDungLai = db.select().from(tonKhoLo).all();

    dungLaiTonKhoDem(db);

    const sauKhiDungLai = db.select().from(tonKhoLo).all();
    const sapXep = (rows: typeof sauKhiDungLai) =>
      [...rows].sort((a, b) => (a.loId + a.chiNhanhId).localeCompare(b.loId + b.chiNhanhId));

    expect(sapXep(sauKhiDungLai)).toEqual(sapXep(truocKhiDungLai));
  });

  it('dựng lại bản đệm hoạt động ngay cả khi bản đệm hiện tại trống rỗng', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    ghiTheKho(db, [
      { id: 'tk-1', chiNhanhId: 'cn-1', loId, loai: 'NHAP', soLuong: 900, thoiGian: '2026-09-13T08:00:00.000Z' },
    ]);
    db.delete(tonKhoLo).run();

    dungLaiTonKhoDem(db);

    expect(tonDem(loId, 'cn-1')).toBe(900);
  });

  it('dựng lại đúng cả giá trị tồn (giá vốn) từ sổ cái sau nhập rồi bán một phần', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    ghiTheKho(db, [
      {
        id: 'tk-1',
        chiNhanhId: 'cn-1',
        loId,
        loai: 'NHAP',
        soLuong: 1000,
        giaTri: 5_100_000,
        thoiGian: '2026-09-15T08:00:00.000Z',
      },
    ]);
    ghiTheKho(db, [
      { id: 'tk-2', chiNhanhId: 'cn-1', loId, loai: 'BAN', soLuong: -3, thoiGian: '2026-09-15T09:00:00.000Z' },
    ]);

    const truocKhiDungLai = tonVaGiaTriDem(loId, 'cn-1');
    db.delete(tonKhoLo).run();

    dungLaiTonKhoDem(db);

    expect(tonVaGiaTriDem(loId, 'cn-1')).toEqual(truocKhiDungLai);
    expect(truocKhiDungLai).toEqual({ ton: 997, giaTriTon: 5_084_700 });
  });
});
