import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { NguoiDungHienTai, VaiTro } from '../../shared/hop-dong/auth';
import { taoUlid } from '../../shared/kieu/ulid';
import { nguoiDung } from '../db/schema';
import { bamMatKhau } from './mat-khau';

type Db = ReturnType<typeof drizzle>;

export const MAT_KHAU_TOI_THIEU = 8;

export class MatKhauQuaNganError extends Error {
  constructor() {
    super(`Mật khẩu phải có ít nhất ${MAT_KHAU_TOI_THIEU} ký tự`);
    this.name = 'MatKhauQuaNganError';
  }
}

export class TenDangNhapKhongHopLeError extends Error {
  constructor() {
    super('Tên đăng nhập không được rỗng và không chứa khoảng trắng');
    this.name = 'TenDangNhapKhongHopLeError';
  }
}

export class TenDangNhapDaTonTaiError extends Error {
  constructor(public readonly tenDangNhap: string) {
    super(`Tên đăng nhập "${tenDangNhap}" đã tồn tại`);
    this.name = 'TenDangNhapDaTonTaiError';
  }
}

export function chuanHoaTenDangNhap(ten: string): string {
  return ten.trim().toLowerCase();
}

export function timNguoiDungTheoTen(db: Db, tenDangNhap: string) {
  return db
    .select()
    .from(nguoiDung)
    .where(eq(nguoiDung.tenDangNhap, chuanHoaTenDangNhap(tenDangNhap)))
    .get();
}

export function taoNguoiDung(
  db: Db,
  dauVao: { tenDangNhap: string; tenHienThi: string; matKhau: string; vaiTro: VaiTro },
): NguoiDungHienTai {
  const ten = chuanHoaTenDangNhap(dauVao.tenDangNhap);
  if (ten.length === 0 || /\s/.test(ten)) throw new TenDangNhapKhongHopLeError();
  if (dauVao.matKhau.length < MAT_KHAU_TOI_THIEU) throw new MatKhauQuaNganError();
  if (timNguoiDungTheoTen(db, ten)) throw new TenDangNhapDaTonTaiError(ten);

  const id = taoUlid();
  const tenHienThi = dauVao.tenHienThi.trim() || ten;
  db.insert(nguoiDung)
    .values({ id, tenDangNhap: ten, tenHienThi, matKhauBam: bamMatKhau(dauVao.matKhau), vaiTro: dauVao.vaiTro })
    .run();

  return { id, tenDangNhap: ten, tenHienThi, vaiTro: dauVao.vaiTro };
}
