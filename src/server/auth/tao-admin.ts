import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { taoNguoiDung } from './nguoi-dung';

type Db = ReturnType<typeof drizzle>;

export function taoAdmin(
  db: Db,
  dauVao: { tenDangNhap: string; matKhau: string; tenHienThi?: string },
): NguoiDungHienTai {
  return taoNguoiDung(db, {
    tenDangNhap: dauVao.tenDangNhap,
    tenHienThi: dauVao.tenHienThi ?? dauVao.tenDangNhap,
    matKhau: dauVao.matKhau,
    vaiTro: 'ADMIN',
  });
}
