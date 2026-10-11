import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NguoiDungHienTai, VaiTro } from '../../shared/hop-dong/auth';
import { kiemTraMatKhau } from './mat-khau';
import { MatKhauQuaNganError, taoNguoiDung, timNguoiDungTheoTen } from './nguoi-dung';
import { docPhien, taoPhien } from './phien';
import {
  KhongTuThayDoiMinhError,
  NguoiDungKhongTonTaiError,
  PhaiConAdminError,
  capNhatNguoiDung,
  datLaiMatKhau,
  layDanhSachNguoiDung,
} from './quan-ly-nguoi-dung';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;
const T0 = Date.parse('2026-10-10T00:00:00.000Z');

function tao(ten: string, vaiTro: VaiTro): NguoiDungHienTai {
  return taoNguoiDung(db, { tenDangNhap: ten, tenHienThi: `Hiển thị ${ten}`, matKhau: 'mat-khau-dai-du', vaiTro });
}

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './src/server/db/migrations' });
});

afterEach(() => {
  sqlite.close();
});

describe('layDanhSachNguoiDung', () => {
  it('trả đủ người dùng theo thứ tự tạo, không lộ mật khẩu băm', () => {
    tao('admin', 'ADMIN');
    tao('lan', 'NHAN_VIEN');

    const ds = layDanhSachNguoiDung(db);

    expect(ds.map((n) => n.tenDangNhap)).toEqual(['admin', 'lan']);
    expect(ds[1]).toMatchObject({ vaiTro: 'NHAN_VIEN', hoatDong: true, tenHienThi: 'Hiển thị lan' });
    expect(JSON.stringify(ds)).not.toContain('scrypt');
    expect(JSON.stringify(ds)).not.toContain('matKhau');
  });
});

describe('capNhatNguoiDung', () => {
  it('đổi tên hiển thị, vai trò, trạng thái của người khác', () => {
    const admin = tao('admin', 'ADMIN');
    const lan = tao('lan', 'NHAN_VIEN');

    const kq = capNhatNguoiDung(db, admin.id, lan.id, { tenHienThi: '  Chị Lan  ', vaiTro: 'ADMIN', hoatDong: false });

    expect(kq).toMatchObject({ tenHienThi: 'Chị Lan', vaiTro: 'ADMIN', hoatDong: false });
  });

  it('người không tồn tại thì NguoiDungKhongTonTaiError', () => {
    const admin = tao('admin', 'ADMIN');

    expect(() => capNhatNguoiDung(db, admin.id, 'khong-co', { hoatDong: false })).toThrow(NguoiDungKhongTonTaiError);
  });

  it('không được tự khoá chính mình', () => {
    const admin = tao('admin', 'ADMIN');
    tao('admin2', 'ADMIN');

    expect(() => capNhatNguoiDung(db, admin.id, admin.id, { hoatDong: false })).toThrow(KhongTuThayDoiMinhError);
  });

  it('không được tự hạ vai trò của chính mình', () => {
    const admin = tao('admin', 'ADMIN');
    tao('admin2', 'ADMIN');

    expect(() => capNhatNguoiDung(db, admin.id, admin.id, { vaiTro: 'NHAN_VIEN' })).toThrow(KhongTuThayDoiMinhError);
  });

  it('tự đổi tên hiển thị của mình thì được, và gửi lại đúng giá trị cũ không bị coi là thay đổi', () => {
    const admin = tao('admin', 'ADMIN');

    const kq = capNhatNguoiDung(db, admin.id, admin.id, { tenHienThi: 'Chủ quầy', vaiTro: 'ADMIN', hoatDong: true });

    expect(kq.tenHienThi).toBe('Chủ quầy');
  });

  it('không được khoá admin hoạt động cuối cùng (kể cả do người khác không phải admin hoạt động)', () => {
    const admin1 = tao('admin1', 'ADMIN');
    const admin2 = tao('admin2', 'ADMIN');
    capNhatNguoiDung(db, admin1.id, admin2.id, { hoatDong: false });

    // admin2 đã khoá; admin1 là admin hoạt động cuối — người thực hiện khác nhân viên khó có, dùng admin2 (đã khoá) làm người thực hiện.
    expect(() => capNhatNguoiDung(db, admin2.id, admin1.id, { hoatDong: false })).toThrow(PhaiConAdminError);
  });

  it('không được hạ vai trò admin hoạt động cuối cùng', () => {
    const admin1 = tao('admin1', 'ADMIN');
    const admin2 = tao('admin2', 'ADMIN');
    capNhatNguoiDung(db, admin1.id, admin2.id, { hoatDong: false });

    expect(() => capNhatNguoiDung(db, admin2.id, admin1.id, { vaiTro: 'NHAN_VIEN' })).toThrow(PhaiConAdminError);
  });

  it('có hai admin hoạt động thì khoá một người được', () => {
    const admin1 = tao('admin1', 'ADMIN');
    const admin2 = tao('admin2', 'ADMIN');

    expect(capNhatNguoiDung(db, admin1.id, admin2.id, { hoatDong: false }).hoatDong).toBe(false);
  });

  it('khoá người dùng thì mọi phiên của họ bị huỷ', () => {
    const admin = tao('admin', 'ADMIN');
    const lan = tao('lan', 'NHAN_VIEN');
    const { maPhien } = taoPhien(db, lan.id, T0);

    capNhatNguoiDung(db, admin.id, lan.id, { hoatDong: false });

    expect(docPhien(db, maPhien, T0)).toBeUndefined();
  });

  it('đổi vai trò thì huỷ phiên để buộc đăng nhập lại với quyền mới', () => {
    const admin = tao('admin', 'ADMIN');
    const lan = tao('lan', 'NHAN_VIEN');
    const { maPhien } = taoPhien(db, lan.id, T0);

    capNhatNguoiDung(db, admin.id, lan.id, { vaiTro: 'ADMIN' });

    expect(docPhien(db, maPhien, T0)).toBeUndefined();
  });

  it('chỉ đổi tên hiển thị thì giữ nguyên phiên', () => {
    const admin = tao('admin', 'ADMIN');
    const lan = tao('lan', 'NHAN_VIEN');
    const { maPhien } = taoPhien(db, lan.id, T0);

    capNhatNguoiDung(db, admin.id, lan.id, { tenHienThi: 'Lan mới' });

    expect(docPhien(db, maPhien, T0)).toBeDefined();
  });
});

describe('datLaiMatKhau', () => {
  it('đặt mật khẩu mới: mật khẩu mới khớp, cũ không khớp, mọi phiên bị huỷ', () => {
    const lan = tao('lan', 'NHAN_VIEN');
    const { maPhien } = taoPhien(db, lan.id, T0);

    datLaiMatKhau(db, lan.id, 'mat-khau-moi-12345');

    const hang = timNguoiDungTheoTen(db, 'lan');
    expect(kiemTraMatKhau('mat-khau-moi-12345', hang?.matKhauBam ?? '')).toBe(true);
    expect(kiemTraMatKhau('mat-khau-dai-du', hang?.matKhauBam ?? '')).toBe(false);
    expect(docPhien(db, maPhien, T0)).toBeUndefined();
  });

  it('từ chối mật khẩu ngắn và giữ nguyên mật khẩu cũ', () => {
    const lan = tao('lan', 'NHAN_VIEN');

    expect(() => datLaiMatKhau(db, lan.id, 'ngan')).toThrow(MatKhauQuaNganError);

    const hang = timNguoiDungTheoTen(db, 'lan');
    expect(kiemTraMatKhau('mat-khau-dai-du', hang?.matKhauBam ?? '')).toBe(true);
  });

  it('người không tồn tại thì NguoiDungKhongTonTaiError', () => {
    expect(() => datLaiMatKhau(db, 'khong-co', 'mat-khau-moi-12345')).toThrow(NguoiDungKhongTonTaiError);
  });
});
