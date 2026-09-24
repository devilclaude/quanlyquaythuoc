import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import { HoaDonResSchema, TaoHoaDonReqSchema } from '../../shared/hop-dong/hoa-don';
import { taoUlid } from '../../shared/kieu/ulid';
import {
  GiamGiaVuotTongError,
  GioHangRongError,
  SoLuongKhongHopLeError,
  taoHoaDonTuGioHang,
} from '../ban-hang/tao-hoa-don';
import { layChiNhanhMacDinh } from '../db/chi-nhanh';
import { KhongDuTonKhoError } from '../kho/fefo';

type Db = ReturnType<typeof drizzle>;

/** Nối màn thanh toán (T-022c) gọi route dưới đây. */
export function dangKyHoaDonRoutes(app: Hono, db: Db): void {
  app.post('/', async (c) => {
    const than = TaoHoaDonReqSchema.safeParse(await c.req.json());
    if (!than.success) {
      return c.json({ loi: 'Dữ liệu không hợp lệ', chiTiet: than.error.flatten() }, 400);
    }

    try {
      const ketQua = taoHoaDonTuGioHang(db, {
        id: taoUlid(),
        chiNhanhId: layChiNhanhMacDinh(db),
        thoiGian: new Date().toISOString(),
        phuongThucThanhToan: than.data.phuongThucThanhToan,
        ...(than.data.giamGia !== undefined ? { giamGia: than.data.giamGia } : {}),
        ...(than.data.thuKhac !== undefined ? { thuKhac: than.data.thuKhac } : {}),
        dong: than.data.dong.map((d) => {
          const { loUuTienThuCong, ...con } = d;
          return {
            ...con,
            id: taoUlid(),
            ...(loUuTienThuCong !== undefined ? { loUuTienThuCong } : {}),
          };
        }),
      });

      return c.json(HoaDonResSchema.parse(ketQua), 201);
    } catch (loi) {
      if (loi instanceof KhongDuTonKhoError) return c.json({ loi: loi.message }, 409);
      if (loi instanceof GiamGiaVuotTongError) return c.json({ loi: loi.message }, 409);
      // Không thể xảy ra khi request đã qua Zod (dong.min(1), soLuong int().positive())
      // — bắt để trả 400 có cấu trúc thay vì 500 nếu bất biến đó từng bị nới lỏng.
      if (loi instanceof GioHangRongError) return c.json({ loi: loi.message }, 400);
      if (loi instanceof SoLuongKhongHopLeError) return c.json({ loi: loi.message }, 400);
      throw loi;
    }
  });
}
