import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Context, Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { DangNhapReqSchema } from '../../shared/hop-dong/auth';
import type { GioiHanDangNhap } from '../auth/gioi-han-dang-nhap';
import { BAM_GIA, kiemTraMatKhau } from '../auth/mat-khau';
import { chuanHoaTenDangNhap, timNguoiDungTheoTen } from '../auth/nguoi-dung';
import { type BienHono, TEN_COOKIE_PHIEN } from '../auth/phan-quyen';
import { THOI_HAN_PHIEN_MS, taoPhien, xoaPhien } from '../auth/phien';

type Db = ReturnType<typeof drizzle>;

const LOI_DANG_NHAP = 'Sai tên đăng nhập hoặc mật khẩu';

/** Đứng sau Cloudflare/proxy nên đọc scheme từ header proxy để đặt cờ `Secure` đúng. */
function laHttps(c: Context): boolean {
  if (c.req.header('X-Forwarded-Proto')?.split(',')[0]?.trim() === 'https') return true;
  if (c.req.header('CF-Visitor')?.includes('"scheme":"https"')) return true;
  return new URL(c.req.url).protocol === 'https:';
}

function layIp(c: Context): string {
  return c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ?? 'khong-ro';
}

export function dangKyAuthRoutes(
  app: Hono<BienHono>,
  db: Db,
  tuyChon: { gioiHan: GioiHanDangNhap; bayGio: () => number },
): void {
  const { gioiHan, bayGio } = tuyChon;

  app.post('/dang-nhap', async (c) => {
    const than = DangNhapReqSchema.safeParse(await c.req.json().catch(() => null));
    if (!than.success) return c.json({ loi: 'Dữ liệu không hợp lệ' }, 400);

    const ten = chuanHoaTenDangNhap(than.data.tenDangNhap);
    const khoa = `${ten}|${layIp(c)}`;
    const kiemTra = gioiHan.kiemTra(khoa, bayGio());
    if (!kiemTra.duocPhep) {
      c.header('Retry-After', String(kiemTra.thuLaiSauGiay));
      return c.json({ loi: 'Đăng nhập sai quá nhiều lần, thử lại sau' }, 429);
    }

    const nguoi = timNguoiDungTheoTen(db, ten);
    // Luôn chạy đúng một lần scrypt, có tên hay không, để thời gian trả lời đồng đều.
    const matKhauDung = kiemTraMatKhau(than.data.matKhau, nguoi?.matKhauBam ?? BAM_GIA);
    if (!nguoi || !matKhauDung || !nguoi.hoatDong) {
      gioiHan.ghiThatBai(khoa, bayGio());
      return c.json({ loi: LOI_DANG_NHAP }, 401);
    }

    gioiHan.xoa(khoa);
    const { maPhien } = taoPhien(db, nguoi.id, bayGio());
    setCookie(c, TEN_COOKIE_PHIEN, maPhien, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      secure: laHttps(c),
      maxAge: THOI_HAN_PHIEN_MS / 1000,
    });
    return c.json(
      { id: nguoi.id, tenDangNhap: nguoi.tenDangNhap, tenHienThi: nguoi.tenHienThi, vaiTro: nguoi.vaiTro },
      200,
    );
  });

  app.post('/dang-xuat', (c) => {
    const maPhien = getCookie(c, TEN_COOKIE_PHIEN);
    if (maPhien) xoaPhien(db, maPhien);
    deleteCookie(c, TEN_COOKIE_PHIEN, { path: '/' });
    return c.body(null, 204);
  });

  app.get('/toi', (c) => c.json(c.get('nguoiDung'), 200));
}
