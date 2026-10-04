import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import {
  DanhSachTraHangNhapResSchema,
  TaoTraHangNhapReqSchema,
  TraHangNhapChiTietResSchema,
  TraHangNhapResSchema,
} from '../../shared/hop-dong/tra-hang-nhap';
import { taoUlid } from '../../shared/kieu/ulid';
import { KhongDuTonKhoError } from '../kho/fefo';
import {
  DongTraHangNhapRongError,
  PhieuNhapChuaHoanThanhError,
  PhieuNhapDongKhongThuocPhieuError,
  PhieuNhapDongKhongTonTaiError,
  PhieuNhapKhongTonTaiError,
  SoLuongKhongHopLeError,
  VuotSoLuongDaNhapError,
  layChiTietTraHangNhap,
  layDanhSachTraHangNhap,
  taoPhieuTraHangNhap,
} from '../tra-hang-nhap/tao-phieu-tra-hang-nhap';

type Db = ReturnType<typeof drizzle>;

/** Nối màn trả hàng nhập (T-053c, chưa dựng) gọi các route dưới đây. */
export function dangKyTraHangNhapRoutes(app: Hono, db: Db): void {
  app.get('/', (c) => {
    const res = DanhSachTraHangNhapResSchema.parse({ duLieu: layDanhSachTraHangNhap(db) });
    return c.json(res);
  });

  app.get('/:id', (c) => {
    const chiTiet = layChiTietTraHangNhap(db, c.req.param('id'));
    if (!chiTiet) return c.json({ loi: 'Không tìm thấy phiếu trả hàng nhập' }, 404);
    return c.json(TraHangNhapChiTietResSchema.parse(chiTiet));
  });

  app.post('/', async (c) => {
    const than = TaoTraHangNhapReqSchema.safeParse(await c.req.json());
    if (!than.success) {
      return c.json({ loi: 'Dữ liệu không hợp lệ', chiTiet: than.error.flatten() }, 400);
    }

    try {
      const ketQua = taoPhieuTraHangNhap(db, {
        id: taoUlid(),
        phieuNhapId: than.data.phieuNhapId,
        thoiGian: new Date().toISOString(),
        dong: than.data.dong.map((d) => ({ id: taoUlid(), phieuNhapDongId: d.phieuNhapDongId, soLuong: d.soLuong })),
      });

      return c.json(TraHangNhapResSchema.parse(ketQua), 201);
    } catch (loi) {
      if (loi instanceof PhieuNhapKhongTonTaiError) return c.json({ loi: loi.message }, 404);
      if (loi instanceof PhieuNhapDongKhongTonTaiError) return c.json({ loi: loi.message }, 404);
      if (loi instanceof PhieuNhapDongKhongThuocPhieuError) return c.json({ loi: loi.message }, 404);
      if (loi instanceof PhieuNhapChuaHoanThanhError) return c.json({ loi: loi.message }, 409);
      if (loi instanceof VuotSoLuongDaNhapError) return c.json({ loi: loi.message }, 409);
      if (loi instanceof KhongDuTonKhoError) return c.json({ loi: loi.message }, 409);
      // Không thể xảy ra khi request đã qua Zod (dong.min(1), soLuong int().positive())
      // — bắt để trả 400 có cấu trúc thay vì 500 nếu bất biến đó từng bị nới lỏng.
      if (loi instanceof DongTraHangNhapRongError) return c.json({ loi: loi.message }, 400);
      if (loi instanceof SoLuongKhongHopLeError) return c.json({ loi: loi.message }, 400);
      throw loi;
    }
  });
}
