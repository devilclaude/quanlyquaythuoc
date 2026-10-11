import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MatKhauQuaNganError, TenDangNhapDaTonTaiError } from './nguoi-dung';
import { taoAdmin } from './tao-admin';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
});

afterEach(() => {
  sqlite.close();
});

describe('taoAdmin', () => {
  it('tạo người dùng vai trò ADMIN', () => {
    const nd = taoAdmin(db, { tenDangNhap: 'admin', matKhau: 'mat-khau-dai-du' });

    expect(nd).toMatchObject({ tenDangNhap: 'admin', vaiTro: 'ADMIN' });
  });

  it('tên hiển thị mặc định là tên đăng nhập, ghi đè được', () => {
    expect(taoAdmin(db, { tenDangNhap: 'admin', matKhau: 'mat-khau-dai-du' }).tenHienThi).toBe('admin');
    expect(
      taoAdmin(db, { tenDangNhap: 'chu', matKhau: 'mat-khau-dai-du', tenHienThi: 'Chủ quầy' }).tenHienThi,
    ).toBe('Chủ quầy');
  });

  it('từ chối mật khẩu ngắn', () => {
    expect(() => taoAdmin(db, { tenDangNhap: 'admin', matKhau: 'ngan' })).toThrow(MatKhauQuaNganError);
  });

  it('từ chối tên đã tồn tại', () => {
    taoAdmin(db, { tenDangNhap: 'admin', matKhau: 'mat-khau-dai-du' });

    expect(() => taoAdmin(db, { tenDangNhap: 'admin', matKhau: 'mat-khau-dai-du' })).toThrow(
      TenDangNhapDaTonTaiError,
    );
  });
});
