import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiNhanh, donViTinh, loHang, sanPham, theKho, tonKhoLo } from './schema';

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

describe('chi_nhanh', () => {
  it('tạo được một chi nhánh', () => {
    db.insert(chiNhanh).values({ id: 'cn-1', ten: 'Quầy chính' }).run();

    const rows = db.select().from(chiNhanh).all();

    expect(rows).toEqual([{ id: 'cn-1', ten: 'Quầy chính' }]);
  });
});

describe('san_pham', () => {
  it('ma_hang trùng bị UNIQUE chặn', () => {
    db.insert(sanPham).values({ id: 'sp-1', maHang: 'SP001', ten: 'Paracetamol 500mg' }).run();

    expect(() =>
      db.insert(sanPham).values({ id: 'sp-2', maHang: 'SP001', ten: 'Hàng khác' }).run(),
    ).toThrow();
  });
});

describe('don_vi_tinh', () => {
  function taoSanPham(id: string, maHang: string) {
    db.insert(sanPham).values({ id, maHang, ten: 'Paracetamol 500mg' }).run();
  }

  it('tạo được đơn vị cơ sở hợp lệ', () => {
    taoSanPham('sp-1', 'SP001');

    db.insert(donViTinh)
      .values({ id: 'dvt-1', sanPhamId: 'sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 })
      .run();

    const rows = db.select().from(donViTinh).all();

    expect(rows).toEqual([
      { id: 'dvt-1', sanPhamId: 'sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 },
    ]);
  });

  it('he_so nhỏ hơn 1 bị chặn', () => {
    taoSanPham('sp-1', 'SP001');

    expect(() =>
      db
        .insert(donViTinh)
        .values({ id: 'dvt-1', sanPhamId: 'sp-1', ten: 'viên', heSo: 0, laCoSo: true, giaBan: 500 })
        .run(),
    ).toThrow();
  });

  it('gia_ban âm bị chặn', () => {
    taoSanPham('sp-1', 'SP001');

    expect(() =>
      db
        .insert(donViTinh)
        .values({ id: 'dvt-1', sanPhamId: 'sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: -1 })
        .run(),
    ).toThrow();
  });

  it('tên đơn vị trùng trong cùng một sản phẩm bị chặn', () => {
    taoSanPham('sp-1', 'SP001');
    db.insert(donViTinh)
      .values({ id: 'dvt-1', sanPhamId: 'sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 })
      .run();

    expect(() =>
      db
        .insert(donViTinh)
        .values({
          id: 'dvt-2',
          sanPhamId: 'sp-1',
          ten: 'viên',
          heSo: 12,
          laCoSo: false,
          giaBan: 6000,
        })
        .run(),
    ).toThrow();
  });

  it('cùng tên đơn vị nhưng khác sản phẩm thì không xung đột', () => {
    taoSanPham('sp-1', 'SP001');
    taoSanPham('sp-2', 'SP002');
    db.insert(donViTinh)
      .values({ id: 'dvt-1', sanPhamId: 'sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 })
      .run();

    expect(() =>
      db
        .insert(donViTinh)
        .values({ id: 'dvt-2', sanPhamId: 'sp-2', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 700 })
        .run(),
    ).not.toThrow();
  });

  it('hai đơn vị cơ sở trong cùng một sản phẩm bị chặn', () => {
    taoSanPham('sp-1', 'SP001');
    db.insert(donViTinh)
      .values({ id: 'dvt-1', sanPhamId: 'sp-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 })
      .run();

    expect(() =>
      db
        .insert(donViTinh)
        .values({ id: 'dvt-2', sanPhamId: 'sp-1', ten: 'vỉ', heSo: 12, laCoSo: true, giaBan: 6000 })
        .run(),
    ).toThrow();
  });
});

describe('lo_hang', () => {
  function taoSanPham(id: string, maHang: string) {
    db.insert(sanPham).values({ id, maHang, ten: 'Paracetamol 500mg' }).run();
  }

  it('tạo san_pham thì trigger tự sinh đúng một lô ngầm định', () => {
    taoSanPham('sp-1', 'SP001');

    const rows = db.select().from(loHang).where(eq(loHang.sanPhamId, 'sp-1')).all();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      sanPhamId: 'sp-1',
      soLo: null,
      hsd: null,
      laLoMacDinh: true,
    });
  });

  it('chèn tay một lô ngầm định thứ hai cho cùng sản phẩm bị chặn', () => {
    taoSanPham('sp-1', 'SP001');

    expect(() =>
      db
        .insert(loHang)
        .values({ id: 'lo-them', sanPhamId: 'sp-1', soLo: null, hsd: null, laLoMacDinh: true })
        .run(),
    ).toThrow();
  });

  it('hai lô thật trùng (san_pham, so_lo, hsd) bị chặn', () => {
    taoSanPham('sp-1', 'SP001');
    db.insert(loHang)
      .values({ id: 'lo-1', sanPhamId: 'sp-1', soLo: 'LOT1', hsd: '2026-12-31' })
      .run();

    expect(() =>
      db
        .insert(loHang)
        .values({ id: 'lo-2', sanPhamId: 'sp-1', soLo: 'LOT1', hsd: '2026-12-31' })
        .run(),
    ).toThrow();
  });

  it('lô thật khác so_lo trên cùng sản phẩm không xung đột', () => {
    taoSanPham('sp-1', 'SP001');
    db.insert(loHang)
      .values({ id: 'lo-1', sanPhamId: 'sp-1', soLo: 'LOT1', hsd: '2026-12-31' })
      .run();

    expect(() =>
      db
        .insert(loHang)
        .values({ id: 'lo-2', sanPhamId: 'sp-1', soLo: 'LOT2', hsd: '2026-12-31' })
        .run(),
    ).not.toThrow();
  });

  it('cùng (so_lo, hsd) nhưng khác sản phẩm không xung đột', () => {
    taoSanPham('sp-1', 'SP001');
    taoSanPham('sp-2', 'SP002');
    db.insert(loHang)
      .values({ id: 'lo-1', sanPhamId: 'sp-1', soLo: 'LOT1', hsd: '2026-12-31' })
      .run();

    expect(() =>
      db
        .insert(loHang)
        .values({ id: 'lo-2', sanPhamId: 'sp-2', soLo: 'LOT1', hsd: '2026-12-31' })
        .run(),
    ).not.toThrow();
  });

  it('lo_hang không có cột chi_nhanh_id — một lô là một lô (SPEC.md §3.6)', () => {
    // @ts-expect-error — cột này không tồn tại, đây chính là điều test khẳng định
    void loHang.chiNhanhId;
  });
});

describe('the_kho', () => {
  function taoChiNhanh(id: string) {
    db.insert(chiNhanh).values({ id, ten: 'Quầy chính' }).run();
  }

  function taoSanPhamCoLo(sanPhamId: string, maHang: string) {
    db.insert(sanPham).values({ id: sanPhamId, maHang, ten: 'Paracetamol 500mg' }).run();
    const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
    if (!lo) throw new Error('trigger lô ngầm định không chạy');
    return lo.id;
  }

  it('ghi được một dòng thẻ kho hợp lệ', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    db.insert(theKho)
      .values({
        id: 'tk-1',
        chiNhanhId: 'cn-1',
        loId,
        loai: 'NHAP',
        soLuong: 900,
        thoiGian: '2026-09-13T08:00:00.000Z',
      })
      .run();

    const rows = db.select().from(theKho).where(eq(theKho.id, 'tk-1')).all();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ loai: 'NHAP', soLuong: 900 });
  });

  it.each(['BAN', 'NHAP', 'TRA_HANG', 'TRA_NCC', 'KIEM_KE', 'XUAT_HUY', 'DOI_CHE_DO'])(
    'chấp nhận loai hợp lệ %s',
    (loai) => {
      taoChiNhanh('cn-1');
      const loId = taoSanPhamCoLo('sp-1', 'SP001');

      expect(() =>
        db
          .insert(theKho)
          .values({
            id: `tk-${loai}`,
            chiNhanhId: 'cn-1',
            loId,
            loai,
            soLuong: 0,
            thoiGian: '2026-09-13T08:00:00.000Z',
          })
          .run(),
      ).not.toThrow();
    },
  );

  it('loai ngoài tập giá trị cho phép bị chặn', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    expect(() =>
      db
        .insert(theKho)
        .values({
          id: 'tk-1',
          chiNhanhId: 'cn-1',
          loId,
          loai: 'KHONG_HOP_LE',
          soLuong: 10,
          thoiGian: '2026-09-13T08:00:00.000Z',
        })
        .run(),
    ).toThrow();
  });

  it('the_kho tự điền thoi_gian_may_chu lúc ghi', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    db.insert(theKho)
      .values({
        id: 'tk-1',
        chiNhanhId: 'cn-1',
        loId,
        loai: 'NHAP',
        soLuong: 900,
        thoiGian: '2026-09-13T08:00:00.000Z',
      })
      .run();

    const [row] = db.select().from(theKho).where(eq(theKho.id, 'tk-1')).all();

    expect(row?.thoiGianMayChu).toBeTruthy();
  });

  it('UPDATE trên the_kho bị trigger CSDL chặn', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    db.insert(theKho)
      .values({
        id: 'tk-1',
        chiNhanhId: 'cn-1',
        loId,
        loai: 'NHAP',
        soLuong: 900,
        thoiGian: '2026-09-13T08:00:00.000Z',
      })
      .run();

    expect(() => db.update(theKho).set({ soLuong: 1 }).where(eq(theKho.id, 'tk-1')).run()).toThrow();
  });

  it('DELETE trên the_kho bị trigger CSDL chặn', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    db.insert(theKho)
      .values({
        id: 'tk-1',
        chiNhanhId: 'cn-1',
        loId,
        loai: 'NHAP',
        soLuong: 900,
        thoiGian: '2026-09-13T08:00:00.000Z',
      })
      .run();

    expect(() => db.delete(theKho).where(eq(theKho.id, 'tk-1')).run()).toThrow();
  });
});

describe('ton_kho_lo', () => {
  function taoChiNhanh(id: string) {
    db.insert(chiNhanh).values({ id, ten: 'Quầy chính' }).run();
  }

  function taoSanPhamCoLo(sanPhamId: string, maHang: string) {
    db.insert(sanPham).values({ id: sanPhamId, maHang, ten: 'Paracetamol 500mg' }).run();
    const [lo] = db.select().from(loHang).where(eq(loHang.sanPhamId, sanPhamId)).all();
    if (!lo) throw new Error('trigger lô ngầm định không chạy');
    return lo.id;
  }

  it('tạo được một dòng tồn kho đệm hợp lệ', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    db.insert(tonKhoLo).values({ loId, chiNhanhId: 'cn-1', ton: 864 }).run();

    const rows = db.select().from(tonKhoLo).where(eq(tonKhoLo.loId, loId)).all();

    expect(rows).toEqual([{ loId, chiNhanhId: 'cn-1', ton: 864, giaTriTon: 0 }]);
  });

  it('trùng (lo_id, chi_nhanh_id) bị chặn', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    db.insert(tonKhoLo).values({ loId, chiNhanhId: 'cn-1', ton: 864 }).run();

    expect(() => db.insert(tonKhoLo).values({ loId, chiNhanhId: 'cn-1', ton: 100 }).run()).toThrow();
  });

  it('cùng lo_id nhưng khác chi_nhanh_id không xung đột', () => {
    taoChiNhanh('cn-1');
    taoChiNhanh('cn-2');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');
    db.insert(tonKhoLo).values({ loId, chiNhanhId: 'cn-1', ton: 864 }).run();

    expect(() =>
      db.insert(tonKhoLo).values({ loId, chiNhanhId: 'cn-2', ton: 100 }).run(),
    ).not.toThrow();
  });

  it('giá trị tồn âm bị chặn ở tầng CSDL', () => {
    taoChiNhanh('cn-1');
    const loId = taoSanPhamCoLo('sp-1', 'SP001');

    expect(() =>
      db.insert(tonKhoLo).values({ loId, chiNhanhId: 'cn-1', ton: 10, giaTriTon: -1 }).run(),
    ).toThrow();
  });
});
