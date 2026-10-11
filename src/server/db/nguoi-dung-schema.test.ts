import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nguoiDung, phien } from './schema';

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

const nguoi = (id: string, ten: string, vaiTro: string = 'NHAN_VIEN') => ({
  id,
  tenDangNhap: ten,
  tenHienThi: ten,
  matKhauBam: 'bam',
  vaiTro: vaiTro as 'ADMIN' | 'NHAN_VIEN',
});

describe('bảng nguoi_dung', () => {
  it('tên đăng nhập là duy nhất', () => {
    db.insert(nguoiDung).values(nguoi('u1', 'lan')).run();

    expect(() => db.insert(nguoiDung).values(nguoi('u2', 'lan')).run()).toThrow(/UNIQUE/i);
  });

  it('chặn vai trò ngoài ADMIN/NHAN_VIEN', () => {
    expect(() => db.insert(nguoiDung).values(nguoi('u1', 'lan', 'GIAM_DOC')).run()).toThrow(/CHECK/i);
  });

  it('chặn tên đăng nhập có chữ hoa hoặc khoảng trắng đầu/cuối', () => {
    expect(() => db.insert(nguoiDung).values(nguoi('u1', 'Lan')).run()).toThrow(/CHECK/i);
    expect(() => db.insert(nguoiDung).values(nguoi('u2', ' lan')).run()).toThrow(/CHECK/i);
  });

  it('mặc định hoạt động = true', () => {
    db.insert(nguoiDung).values(nguoi('u1', 'lan')).run();

    expect(db.select().from(nguoiDung).all()[0]?.hoatDong).toBe(true);
  });
});

describe('bảng phien', () => {
  it('phiên phải trỏ tới người dùng có thật (khoá ngoại)', () => {
    expect(() =>
      db.insert(phien).values({ idBam: 'h1', nguoiDungId: 'khong-co', hetHan: '2030-01-01T00:00:00.000Z' }).run(),
    ).toThrow(/FOREIGN KEY/i);
  });
});
