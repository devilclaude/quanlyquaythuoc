import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { docPhien } from './phien';

type Db = ReturnType<typeof drizzle>;

export const TEN_COOKIE_PHIEN = 'phien';

export type BienHono = { Variables: { nguoiDung: NguoiDungHienTai } };

/**
 * `NHAN_VIEN` là vai trò TỐI THIỂU: nhân viên và admin đều dùng được.
 * `ADMIN` chỉ admin. `DA_DANG_NHAP` là mọi vai trò nhưng phải có phiên.
 */
export type MucQuyen = 'CONG_KHAI' | 'DA_DANG_NHAP' | 'NHAN_VIEN' | 'ADMIN';

interface QuyTac {
  phuongThuc: readonly string[];
  mau: RegExp;
  muc: MucQuyen;
}

// Khớp theo thứ tự, quy tắc đầu tiên thắng. Mẫu neo `^…$` để `/api/hang-hoa-bi-mat`
// không lọt vào quy tắc của `/api/hang-hoa`. Không khớp quy tắc nào → ADMIN.
const BANG_QUYEN: readonly QuyTac[] = [
  { phuongThuc: ['OPTIONS'], mau: /^\/api\/.*$/, muc: 'CONG_KHAI' },
  { phuongThuc: ['GET'], mau: /^\/api\/suc-khoe$/, muc: 'CONG_KHAI' },
  { phuongThuc: ['POST'], mau: /^\/api\/auth\/dang-nhap$/, muc: 'CONG_KHAI' },
  { phuongThuc: ['GET'], mau: /^\/api\/auth\/toi$/, muc: 'DA_DANG_NHAP' },
  { phuongThuc: ['POST'], mau: /^\/api\/auth\/dang-xuat$/, muc: 'DA_DANG_NHAP' },
  // Bán hàng và đồng bộ offline.
  { phuongThuc: ['POST'], mau: /^\/api\/hoa-don$/, muc: 'NHAN_VIEN' },
  { phuongThuc: ['GET'], mau: /^\/api\/hoa-don(\/[^/]+)?$/, muc: 'NHAN_VIEN' },
  { phuongThuc: ['POST'], mau: /^\/api\/dong-bo$/, muc: 'NHAN_VIEN' },
  // Tìm hàng khi bán — chỉ danh sách, không có chi tiết hàng.
  { phuongThuc: ['GET'], mau: /^\/api\/hang-hoa$/, muc: 'NHAN_VIEN' },
  // Trả hàng bán (tra cứu hoá đơn + tạo phiếu).
  { phuongThuc: ['GET', 'POST'], mau: /^\/api\/tra-hang(\/.*)?$/, muc: 'NHAN_VIEN' },
];

export function layMucQuyen(phuongThuc: string, duongDan: string): MucQuyen {
  const pt = phuongThuc.toUpperCase();
  for (const quyTac of BANG_QUYEN) {
    if (quyTac.phuongThuc.includes(pt) && quyTac.mau.test(duongDan)) return quyTac.muc;
  }
  return 'ADMIN';
}

export function batXacThuc(db: Db, bayGio: () => number): MiddlewareHandler<BienHono> {
  return async (c, next) => {
    const muc = layMucQuyen(c.req.method, c.req.path);
    if (muc === 'CONG_KHAI') return next();

    const maPhien = getCookie(c, TEN_COOKIE_PHIEN);
    const nguoiDung = maPhien ? docPhien(db, maPhien, bayGio()) : undefined;
    if (!nguoiDung) return c.json({ loi: 'Chưa đăng nhập' }, 401);

    if (muc === 'ADMIN' && nguoiDung.vaiTro !== 'ADMIN') return c.json({ loi: 'Không đủ quyền' }, 403);

    c.set('nguoiDung', nguoiDung);
    return next();
  };
}
