import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nguoiDung, phien } from '../db/schema';
import { taoNguoiDung } from './nguoi-dung';
import { THOI_HAN_PHIEN_MS, docPhien, taoPhien, xoaMoiPhienCua, xoaPhien } from './phien';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;
let nguoiId: string;
const T0 = Date.parse('2026-10-10T00:00:00.000Z');
const NGAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
  nguoiId = taoNguoiDung(db, {
    tenDangNhap: 'lan',
    tenHienThi: 'Chị Lan',
    matKhau: 'mat-khau-dai-du',
    vaiTro: 'NHAN_VIEN',
  }).id;
});

afterEach(() => {
  sqlite.close();
});

describe('taoPhien / docPhien', () => {
  it('mã phiên tạo ra đọc lại được người dùng đúng', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);

    expect(docPhien(db, maPhien, T0 + 1000)).toEqual({
      id: nguoiId,
      tenDangNhap: 'lan',
      tenHienThi: 'Chị Lan',
      vaiTro: 'NHAN_VIEN',
    });
  });

  it('DB chỉ lưu bản băm, không lưu mã phiên gốc', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);

    const hang = db.select().from(phien).all()[0];
    expect(hang?.idBam).not.toBe(maPhien);
    expect(hang?.idBam).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hai phiên có mã khác nhau', () => {
    expect(taoPhien(db, nguoiId, T0).maPhien).not.toBe(taoPhien(db, nguoiId, T0).maPhien);
  });

  it('mã phiên lạ thì không đọc được', () => {
    expect(docPhien(db, 'khong-co-phien-nay', T0)).toBeUndefined();
  });

  it('hết hạn sau 30 ngày: không đọc được và dòng phiên bị xoá', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);

    expect(docPhien(db, maPhien, T0 + THOI_HAN_PHIEN_MS + 1)).toBeUndefined();
    expect(db.select().from(phien).all()).toHaveLength(0);
  });

  it('còn hạn đúng sát mốc 30 ngày thì vẫn đọc được', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);

    expect(docPhien(db, maPhien, T0 + THOI_HAN_PHIEN_MS - 1000)).toBeDefined();
  });

  it('gia hạn trượt: dùng sau 2 ngày thì hạn dời ra 30 ngày kể từ lúc đó', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);

    docPhien(db, maPhien, T0 + 2 * NGAY);

    const hang = db.select().from(phien).all()[0];
    expect(Date.parse(hang?.hetHan ?? '')).toBe(T0 + 2 * NGAY + THOI_HAN_PHIEN_MS);
  });

  it('không gia hạn khi mới dùng trong vòng 1 ngày (tránh ghi DB mỗi request)', () => {
    const { maPhien, hetHan } = taoPhien(db, nguoiId, T0);

    docPhien(db, maPhien, T0 + 60 * 60 * 1000);

    expect(db.select().from(phien).all()[0]?.hetHan).toBe(hetHan);
  });

  it('người dùng bị khoá thì phiên không còn dùng được', () => {
    const { maPhien } = taoPhien(db, nguoiId, T0);
    db.update(nguoiDung).set({ hoatDong: false }).where(eq(nguoiDung.id, nguoiId)).run();

    expect(docPhien(db, maPhien, T0 + 1000)).toBeUndefined();
  });
});

describe('xoaPhien / xoaMoiPhienCua', () => {
  it('xoaPhien xoá đúng một phiên', () => {
    const a = taoPhien(db, nguoiId, T0);
    const b = taoPhien(db, nguoiId, T0);

    xoaPhien(db, a.maPhien);

    expect(docPhien(db, a.maPhien, T0)).toBeUndefined();
    expect(docPhien(db, b.maPhien, T0)).toBeDefined();
  });

  it('xoaMoiPhienCua xoá mọi phiên của người đó', () => {
    const a = taoPhien(db, nguoiId, T0);
    const b = taoPhien(db, nguoiId, T0);

    xoaMoiPhienCua(db, nguoiId);

    expect(docPhien(db, a.maPhien, T0)).toBeUndefined();
    expect(docPhien(db, b.maPhien, T0)).toBeUndefined();
  });
});
