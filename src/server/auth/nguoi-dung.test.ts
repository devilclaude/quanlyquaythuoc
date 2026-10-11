import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { kiemTraMatKhau } from './mat-khau';
import {
  MatKhauQuaNganError,
  TenDangNhapDaTonTaiError,
  TenDangNhapKhongHopLeError,
  chuanHoaTenDangNhap,
  taoNguoiDung,
  timNguoiDungTheoTen,
} from './nguoi-dung';

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

const dauVao = { tenDangNhap: 'lan', tenHienThi: 'Chị Lan', matKhau: 'mat-khau-dai-du', vaiTro: 'NHAN_VIEN' as const };

describe('taoNguoiDung', () => {
  it('tạo người dùng, trả về thông tin công khai không có mật khẩu', () => {
    const nd = taoNguoiDung(db, dauVao);

    const { id, ...phanCon } = nd;
    expect(id).toMatch(/^[0-9A-Z]{26}$/);
    expect(phanCon).toEqual({ tenDangNhap: 'lan', tenHienThi: 'Chị Lan', vaiTro: 'NHAN_VIEN' });
    expect(JSON.stringify(nd)).not.toContain('mat-khau-dai-du');
  });

  it('lưu mật khẩu đã băm, không lưu mật khẩu gốc', () => {
    taoNguoiDung(db, dauVao);

    const hang = timNguoiDungTheoTen(db, 'lan');
    expect(hang?.matKhauBam).not.toContain('mat-khau-dai-du');
    expect(kiemTraMatKhau('mat-khau-dai-du', hang?.matKhauBam ?? '')).toBe(true);
  });

  it('chuẩn hoá tên đăng nhập: trim và chữ thường', () => {
    const nd = taoNguoiDung(db, { ...dauVao, tenDangNhap: '  Lan ' });

    expect(nd.tenDangNhap).toBe('lan');
  });

  it('từ chối mật khẩu ngắn hơn 8 ký tự', () => {
    expect(() => taoNguoiDung(db, { ...dauVao, matKhau: '1234567' })).toThrow(MatKhauQuaNganError);
  });

  it('chấp nhận mật khẩu đúng 8 ký tự', () => {
    expect(() => taoNguoiDung(db, { ...dauVao, matKhau: '12345678' })).not.toThrow();
  });

  it('từ chối tên đăng nhập rỗng hoặc có khoảng trắng ở giữa', () => {
    expect(() => taoNguoiDung(db, { ...dauVao, tenDangNhap: '   ' })).toThrow(TenDangNhapKhongHopLeError);
    expect(() => taoNguoiDung(db, { ...dauVao, tenDangNhap: 'chi lan' })).toThrow(TenDangNhapKhongHopLeError);
  });

  it('từ chối tên đã tồn tại, kể cả khác hoa/thường', () => {
    taoNguoiDung(db, dauVao);

    expect(() => taoNguoiDung(db, { ...dauVao, tenDangNhap: 'LAN' })).toThrow(TenDangNhapDaTonTaiError);
  });
});

describe('timNguoiDungTheoTen', () => {
  it('tìm không phân biệt hoa/thường và khoảng trắng', () => {
    taoNguoiDung(db, dauVao);

    expect(timNguoiDungTheoTen(db, ' LAN ')?.tenDangNhap).toBe('lan');
  });

  it('không có thì trả undefined', () => {
    expect(timNguoiDungTheoTen(db, 'khong-co')).toBeUndefined();
  });
});

describe('chuanHoaTenDangNhap', () => {
  it('trim và hạ chữ thường', () => {
    expect(chuanHoaTenDangNhap('  Admin ')).toBe('admin');
  });
});
