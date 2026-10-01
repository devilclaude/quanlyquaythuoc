import type { drizzle } from 'drizzle-orm/better-sqlite3';
import type { Hono } from 'hono';
import {
  DanhSachPhieuNhapResSchema,
  PhieuNhapChiTietResSchema,
  PhieuNhapResSchema,
  SuaPhieuNhapReqSchema,
  TaoPhieuNhapReqSchema,
  TrangThaiPhieuNhapSchema,
  type PhieuNhapDongReq,
  type TrangThaiPhieuNhap,
} from '../../shared/hop-dong/phieu-nhap';
import { taoUlid } from '../../shared/kieu/ulid';
import { layChiNhanhMacDinh } from '../db/chi-nhanh';
import { nhapHangTuFileExcel, taoMauExcelNhapHang } from '../nhap-hang/nhap-tu-excel';
import {
  DongPhieuNhapRongError,
  LoHsdKhongDayDuError,
  PhieuDaHoanThanhError,
  PhieuNhapKhongTonTaiError,
  SanPhamKhongTonTaiError,
  SoLuongKhongHopLeError,
  SuaPhieuDaHoanThanhError,
  ThieuLoHsdError,
  hoanThanhPhieuNhap,
  layChiTietPhieuNhap,
  layDanhSachPhieuNhap,
  suaPhieuNhap,
  taoPhieuNhap,
  type DongPhieuNhapInput,
} from '../nhap-hang/tao-phieu-nhap';

type Db = ReturnType<typeof drizzle>;

// `exactOptionalPropertyTypes` cấm gán thẳng `soLo: string | null | undefined`
// (kiểu Zod `.nullable().optional()`) vào `DongPhieuNhapInput.soLo?: string |
// null` — phải bỏ hẳn key khi giá trị là `undefined`, không gán `undefined`.
function chuanHoaDong(d: PhieuNhapDongReq): DongPhieuNhapInput {
  return {
    id: taoUlid(),
    sanPhamId: d.sanPhamId,
    donViTen: d.donViTen,
    heSo: d.heSo,
    donGia: d.donGia,
    soLuong: d.soLuong,
    ...(d.soLo !== undefined ? { soLo: d.soLo } : {}),
    ...(d.hsd !== undefined ? { hsd: d.hsd } : {}),
  };
}

/** Nối màn nhập hàng (T-040c) gọi các route dưới đây. */
export function dangKyPhieuNhapRoutes(app: Hono, db: Db): void {
  // Bộ lọc màn "Danh sách nhập hàng" (T-041): theo mã (một phần), trạng thái
  // (nhiều giá trị lặp lại `?trangThai=A&trangThai=B`). Lọc theo khoảng thời
  // gian chẻ sang T-041b (xem BACKLOG.md). Giá trị `trangThai` không hợp lệ bị
  // bỏ qua thay vì làm lỗi truy vấn.
  app.get('/', (c) => {
    const tim = c.req.query('tim');
    const trangThai = c.req
      .queries('trangThai')
      ?.filter((gt): gt is TrangThaiPhieuNhap => TrangThaiPhieuNhapSchema.safeParse(gt).success);

    const res = DanhSachPhieuNhapResSchema.parse({
      duLieu: layDanhSachPhieuNhap(db, {
        ...(tim ? { tim } : {}),
        ...(trangThai && trangThai.length > 0 ? { trangThai } : {}),
      }),
    });
    return c.json(res);
  });

  // Đăng ký TRƯỚC `/:id` — nếu không, `mau-excel`/`tu-excel` sẽ khớp nhầm vào
  // tham số `:id` của route đó.
  app.get('/mau-excel', async (c) => {
    const buf = await taoMauExcelNhapHang();
    c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    c.header('Content-Disposition', 'attachment; filename="mau-nhap-hang.xlsx"');
    return c.body(buf);
  });

  app.post('/tu-excel', async (c) => {
    const than = await c.req.parseBody();
    const file = than['file'];
    if (!(file instanceof File)) {
      return c.json({ thanhCong: false, loi: [{ dong: 0, thongDiep: 'Thiếu file — chọn một file .xlsx để tải lên' }] }, 400);
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    const ketQua = await nhapHangTuFileExcel(db, buf, layChiNhanhMacDinh(db), new Date().toISOString());
    return c.json(ketQua, ketQua.thanhCong ? 201 : 400);
  });

  app.get('/:id', (c) => {
    const chiTiet = layChiTietPhieuNhap(db, c.req.param('id'));
    if (!chiTiet) return c.json({ loi: 'Không tìm thấy phiếu nhập' }, 404);
    return c.json(PhieuNhapChiTietResSchema.parse(chiTiet));
  });

  app.post('/', async (c) => {
    const than = TaoPhieuNhapReqSchema.safeParse(await c.req.json());
    if (!than.success) {
      return c.json({ loi: 'Dữ liệu không hợp lệ', chiTiet: than.error.flatten() }, 400);
    }

    try {
      const ketQua = taoPhieuNhap(db, {
        id: taoUlid(),
        chiNhanhId: layChiNhanhMacDinh(db),
        thoiGian: new Date().toISOString(),
        ...(than.data.hoanThanhNgay !== undefined ? { hoanThanhNgay: than.data.hoanThanhNgay } : {}),
        dong: than.data.dong.map(chuanHoaDong),
      });

      return c.json(PhieuNhapResSchema.parse(ketQua), 201);
    } catch (loi) {
      if (loi instanceof ThieuLoHsdError) return c.json({ loi: loi.message }, 409);
      if (loi instanceof LoHsdKhongDayDuError) return c.json({ loi: loi.message }, 409);
      // Không thể xảy ra khi request đã qua Zod (dong.min(1), soLuong int().positive())
      // — bắt để trả 400 có cấu trúc thay vì 500 nếu bất biến đó từng bị nới lỏng.
      if (loi instanceof DongPhieuNhapRongError) return c.json({ loi: loi.message }, 400);
      if (loi instanceof SoLuongKhongHopLeError) return c.json({ loi: loi.message }, 400);
      throw loi;
    }
  });

  app.put('/:id', async (c) => {
    const than = SuaPhieuNhapReqSchema.safeParse(await c.req.json());
    if (!than.success) {
      return c.json({ loi: 'Dữ liệu không hợp lệ', chiTiet: than.error.flatten() }, 400);
    }

    const id = c.req.param('id');
    try {
      suaPhieuNhap(db, id, than.data.dong.map(chuanHoaDong));

      const chiTiet = layChiTietPhieuNhap(db, id);
      if (!chiTiet) throw new Error('không đọc lại được phiếu nhập vừa sửa');
      return c.json(PhieuNhapChiTietResSchema.parse(chiTiet));
    } catch (loi) {
      if (loi instanceof PhieuNhapKhongTonTaiError) return c.json({ loi: loi.message }, 404);
      if (loi instanceof SuaPhieuDaHoanThanhError) return c.json({ loi: loi.message }, 409);
      if (loi instanceof DongPhieuNhapRongError) return c.json({ loi: loi.message }, 400);
      if (loi instanceof SoLuongKhongHopLeError) return c.json({ loi: loi.message }, 400);
      throw loi;
    }
  });

  app.post('/:id/hoan-thanh', (c) => {
    const id = c.req.param('id');
    try {
      hoanThanhPhieuNhap(db, id, new Date().toISOString());

      const chiTiet = layChiTietPhieuNhap(db, id);
      if (!chiTiet) throw new Error('không đọc lại được phiếu nhập vừa hoàn thành');
      return c.json(PhieuNhapChiTietResSchema.parse(chiTiet));
    } catch (loi) {
      if (loi instanceof PhieuNhapKhongTonTaiError) return c.json({ loi: loi.message }, 404);
      if (loi instanceof PhieuDaHoanThanhError) return c.json({ loi: loi.message }, 409);
      if (loi instanceof ThieuLoHsdError) return c.json({ loi: loi.message }, 409);
      if (loi instanceof LoHsdKhongDayDuError) return c.json({ loi: loi.message }, 409);
      // Sản phẩm bị xoá cứng sau khi phiếu đã lưu tạm (chưa phát sinh thẻ kho
      // nên được phép xoá) nhưng trước khi hoàn thành — trạng thái xung đột
      // phát hiện lúc hoàn thành, không phải lỗi của tham số :id trên URL.
      if (loi instanceof SanPhamKhongTonTaiError) return c.json({ loi: loi.message }, 409);
      throw loi;
    }
  });
}
