import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Context, Hono } from 'hono';
import {
  CapNhatNguoiDungReqSchema,
  DanhSachNguoiDungResSchema,
  DatLaiMatKhauReqSchema,
  NguoiDungQuanLySchema,
  TaoNguoiDungReqSchema,
} from '../../shared/hop-dong/nguoi-dung';
import {
  MatKhauQuaNganError,
  TenDangNhapDaTonTaiError,
  TenDangNhapKhongHopLeError,
  taoNguoiDung,
} from '../auth/nguoi-dung';
import type { BienHono } from '../auth/phan-quyen';
import {
  KhongTuThayDoiMinhError,
  NguoiDungKhongTonTaiError,
  PhaiConAdminError,
  capNhatNguoiDung,
  datLaiMatKhau,
  layDanhSachNguoiDung,
} from '../auth/quan-ly-nguoi-dung';

type Db = ReturnType<typeof drizzle>;

/** Lỗi nghiệp vụ → mã HTTP. Trả `undefined` nếu không phải lỗi của lớp này (để ném tiếp). */
function traLoiNghiepVu(c: Context, loi: unknown): Response | undefined {
  if (loi instanceof NguoiDungKhongTonTaiError) return c.json({ loi: loi.message }, 404);
  if (loi instanceof TenDangNhapDaTonTaiError) return c.json({ loi: loi.message }, 409);
  if (loi instanceof KhongTuThayDoiMinhError || loi instanceof PhaiConAdminError) {
    return c.json({ loi: loi.message }, 409);
  }
  if (loi instanceof MatKhauQuaNganError || loi instanceof TenDangNhapKhongHopLeError) {
    return c.json({ loi: loi.message }, 400);
  }
  return undefined;
}

/** Quản lý người dùng — chỉ admin (không có trong bảng quyền nên mặc định là ADMIN). */
export function dangKyNguoiDungRoutes(app: Hono<BienHono>, db: Db): void {
  app.get('/', (c) => c.json(DanhSachNguoiDungResSchema.parse({ duLieu: layDanhSachNguoiDung(db) })));

  app.post('/', async (c) => {
    const than = TaoNguoiDungReqSchema.safeParse(await c.req.json().catch(() => null));
    if (!than.success) return c.json({ loi: 'Dữ liệu không hợp lệ' }, 400);
    try {
      const moi = taoNguoiDung(db, than.data);
      const dongMoi = layDanhSachNguoiDung(db).find((n) => n.id === moi.id);
      return c.json(NguoiDungQuanLySchema.parse(dongMoi), 201);
    } catch (loi) {
      const phanHoi = traLoiNghiepVu(c, loi);
      if (phanHoi) return phanHoi;
      throw loi;
    }
  });

  app.put('/:id', async (c) => {
    const than = CapNhatNguoiDungReqSchema.safeParse(await c.req.json().catch(() => null));
    if (!than.success) return c.json({ loi: 'Dữ liệu không hợp lệ' }, 400);
    try {
      const { tenHienThi, vaiTro, hoatDong } = than.data;
      const capNhat = capNhatNguoiDung(db, c.get('nguoiDung').id, c.req.param('id'), {
        ...(tenHienThi !== undefined ? { tenHienThi } : {}),
        ...(vaiTro !== undefined ? { vaiTro } : {}),
        ...(hoatDong !== undefined ? { hoatDong } : {}),
      });
      return c.json(NguoiDungQuanLySchema.parse(capNhat), 200);
    } catch (loi) {
      const phanHoi = traLoiNghiepVu(c, loi);
      if (phanHoi) return phanHoi;
      throw loi;
    }
  });

  app.post('/:id/dat-lai-mat-khau', async (c) => {
    const than = DatLaiMatKhauReqSchema.safeParse(await c.req.json().catch(() => null));
    if (!than.success) return c.json({ loi: 'Dữ liệu không hợp lệ' }, 400);
    try {
      datLaiMatKhau(db, c.req.param('id'), than.data.matKhau);
      return c.body(null, 204);
    } catch (loi) {
      const phanHoi = traLoiNghiepVu(c, loi);
      if (phanHoi) return phanHoi;
      throw loi;
    }
  });
}
