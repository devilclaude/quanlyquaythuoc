import { z } from 'zod';

// Hợp đồng API dùng chung client/server (ARCHITECTURE.md §1) cho T-052b — tạo
// phiếu trả hàng cho một hoá đơn. Tiền và số lượng đều `z.number().int()`:
// SPEC.md §3.4/§3.3 cấm số thực cho tiền và số lượng ở mọi tầng. `soLuong` ở
// đây là đơn vị CƠ SỞ (khác `hoa_don_dong.so_luong`) — trả hàng thao tác thẳng
// trên sổ cái, không có khái niệm "đơn vị đã chọn" riêng (xem schema.ts).
export const TraHangDongReqSchema = z.object({
  hoaDonDongId: z.string().min(1),
  soLuong: z.number().int().positive(),
});

export const TaoTraHangReqSchema = z.object({
  hoaDonId: z.string().min(1),
  dong: z.array(TraHangDongReqSchema).min(1),
});

export const TraHangResSchema = z.object({
  id: z.string(),
  ma: z.string(),
  tongTienHoan: z.number().int(),
});

export const TraHangDongResSchema = z.object({
  id: z.string(),
  hoaDonDongId: z.string(),
  sanPhamId: z.string(),
  /** Mã/tên sản phẩm HIỆN TẠI, tra lúc đọc — không snapshot. */
  maHang: z.string(),
  ten: z.string(),
  soLuong: z.number().int(),
  tienHoan: z.number().int(),
});

export const TraHangDanhSachItemSchema = z.object({
  id: z.string(),
  ma: z.string(),
  hoaDonId: z.string(),
  /** Mã hoá đơn gốc — liên kết ngược (T-052b). */
  hoaDonMa: z.string(),
  chiNhanhId: z.string(),
  /** Giờ thiết bị lúc thao tác xảy ra (ISO). */
  thoiGian: z.string(),
  tongTienHoan: z.number().int(),
});

export const DanhSachTraHangResSchema = z.object({
  duLieu: z.array(TraHangDanhSachItemSchema),
});

export const TraHangChiTietResSchema = TraHangDanhSachItemSchema.extend({
  dong: z.array(TraHangDongResSchema),
});

// T-052c — tìm hoá đơn gốc theo mã để bắt đầu luồng tạo trả hàng
// (`GET /api/tra-hang/hoa-don/:ma`). `conLaiToiDa` CHỈ để gợi ý/giới hạn input
// trên giao diện — `POST /api/tra-hang` vẫn là nơi xác thực cuối cùng (409 khi
// vượt), tính lại đúng cùng công thức ở `timHoaDonDeTraHang`.
export const HoaDonDongDeTraHangItemSchema = z.object({
  id: z.string(),
  sanPhamId: z.string(),
  maHang: z.string(),
  ten: z.string(),
  donViTen: z.string(),
  heSo: z.number().int().min(1),
  soLuongDaBan: z.number().int(),
  conLaiToiDa: z.number().int(),
});

export const HoaDonDeTraHangResSchema = z.object({
  id: z.string(),
  ma: z.string(),
  thoiGian: z.string(),
  dong: z.array(HoaDonDongDeTraHangItemSchema),
});

export type TraHangDongReq = z.infer<typeof TraHangDongReqSchema>;
export type TaoTraHangReq = z.infer<typeof TaoTraHangReqSchema>;
export type TraHangRes = z.infer<typeof TraHangResSchema>;
export type TraHangDanhSachItem = z.infer<typeof TraHangDanhSachItemSchema>;
export type DanhSachTraHangRes = z.infer<typeof DanhSachTraHangResSchema>;
export type TraHangChiTietRes = z.infer<typeof TraHangChiTietResSchema>;
export type HoaDonDongDeTraHangItem = z.infer<typeof HoaDonDongDeTraHangItemSchema>;
export type HoaDonDeTraHangRes = z.infer<typeof HoaDonDeTraHangResSchema>;
