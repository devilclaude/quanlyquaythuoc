import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import { DanhSachTraHangResSchema, TaoTraHangReqSchema, TraHangChiTietResSchema, TraHangResSchema } from '../../shared/hop-dong/tra-hang';
import { taoUlid } from '../../shared/kieu/ulid';
import {
  DongTraHangRongError,
  HoaDonDongKhongThuocHoaDonError,
  HoaDonDongKhongTonTaiError,
  HoaDonKhongTonTaiError,
  SoLuongKhongHopLeError,
  VuotSoLuongDaBanError,
  layChiTietTraHang,
  layDanhSachTraHang,
  taoPhieuTraHang,
} from '../tra-hang/tao-phieu-tra-hang';

type Db = ReturnType<typeof drizzle>;

/** Nối màn trả hàng (T-052c, chưa dựng) gọi các route dưới đây. */
export function dangKyTraHangRoutes(app: Hono, db: Db): void {
  app.get('/', (c) => {
    const res = DanhSachTraHangResSchema.parse({ duLieu: layDanhSachTraHang(db) });
    return c.json(res);
  });

  app.get('/:id', (c) => {
    const chiTiet = layChiTietTraHang(db, c.req.param('id'));
    if (!chiTiet) return c.json({ loi: 'Không tìm thấy phiếu trả hàng' }, 404);
    return c.json(TraHangChiTietResSchema.parse(chiTiet));
  });

  app.post('/', async (c) => {
    const than = TaoTraHangReqSchema.safeParse(await c.req.json());
    if (!than.success) {
      return c.json({ loi: 'Dữ liệu không hợp lệ', chiTiet: than.error.flatten() }, 400);
    }

    try {
      const ketQua = taoPhieuTraHang(db, {
        id: taoUlid(),
        hoaDonId: than.data.hoaDonId,
        thoiGian: new Date().toISOString(),
        dong: than.data.dong.map((d) => ({ id: taoUlid(), hoaDonDongId: d.hoaDonDongId, soLuong: d.soLuong })),
      });

      return c.json(TraHangResSchema.parse(ketQua), 201);
    } catch (loi) {
      if (loi instanceof HoaDonKhongTonTaiError) return c.json({ loi: loi.message }, 404);
      if (loi instanceof HoaDonDongKhongTonTaiError) return c.json({ loi: loi.message }, 404);
      if (loi instanceof HoaDonDongKhongThuocHoaDonError) return c.json({ loi: loi.message }, 404);
      if (loi instanceof VuotSoLuongDaBanError) return c.json({ loi: loi.message }, 409);
      // Không thể xảy ra khi request đã qua Zod (dong.min(1), soLuong int().positive())
      // — bắt để trả 400 có cấu trúc thay vì 500 nếu bất biến đó từng bị nới lỏng.
      if (loi instanceof DongTraHangRongError) return c.json({ loi: loi.message }, 400);
      if (loi instanceof SoLuongKhongHopLeError) return c.json({ loi: loi.message }, 400);
      throw loi;
    }
  });
}
