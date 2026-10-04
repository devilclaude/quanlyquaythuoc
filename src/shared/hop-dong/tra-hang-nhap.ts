import { z } from 'zod';

// Hợp đồng API dùng chung client/server (ARCHITECTURE.md §1) cho T-053b — tạo
// phiếu trả hàng nhập (trả NCC) cho một phiếu nhập. Tiền và số lượng đều
// `z.number().int()`: SPEC.md §3.4/§3.3 cấm số thực cho tiền và số lượng ở mọi
// tầng. `soLuong` ở đây là đơn vị CƠ SỞ (khác `phieu_nhap_dong.so_luong`) —
// cùng tiền lệ `TraHangDongReqSchema` (T-052b).
export const TraHangNhapDongReqSchema = z.object({
  phieuNhapDongId: z.string().min(1),
  soLuong: z.number().int().positive(),
});

export const TaoTraHangNhapReqSchema = z.object({
  phieuNhapId: z.string().min(1),
  dong: z.array(TraHangNhapDongReqSchema).min(1),
});

export const TraHangNhapResSchema = z.object({
  id: z.string(),
  ma: z.string(),
  tongTienHoan: z.number().int(),
});

export const TraHangNhapDongResSchema = z.object({
  id: z.string(),
  phieuNhapDongId: z.string(),
  sanPhamId: z.string(),
  /** Mã/tên sản phẩm HIỆN TẠI, tra lúc đọc — không snapshot. */
  maHang: z.string(),
  ten: z.string(),
  soLuong: z.number().int(),
  tienHoan: z.number().int(),
});

export const TraHangNhapDanhSachItemSchema = z.object({
  id: z.string(),
  ma: z.string(),
  phieuNhapId: z.string(),
  /** Mã phiếu nhập gốc — liên kết ngược (T-053b). */
  phieuNhapMa: z.string(),
  chiNhanhId: z.string(),
  /** Giờ thiết bị lúc thao tác xảy ra (ISO). */
  thoiGian: z.string(),
  tongTienHoan: z.number().int(),
});

export const DanhSachTraHangNhapResSchema = z.object({
  duLieu: z.array(TraHangNhapDanhSachItemSchema),
});

export const TraHangNhapChiTietResSchema = TraHangNhapDanhSachItemSchema.extend({
  dong: z.array(TraHangNhapDongResSchema),
});

// T-053c2 — tìm phiếu nhập gốc theo mã để bắt đầu luồng tạo trả hàng nhập
// (`GET /api/tra-hang-nhap/phieu-nhap/:ma`). `conLaiToiDa` CHỈ để gợi ý/giới
// hạn input trên giao diện — `POST /api/tra-hang-nhap` vẫn là nơi xác thực
// cuối cùng (409 khi vượt), tính lại đúng cùng công thức ở
// `timPhieuNhapDeTraHangNhap`. Cùng khuôn `HoaDonDongDeTraHangItemSchema`
// (T-052c).
export const PhieuNhapDongDeTraHangNhapItemSchema = z.object({
  id: z.string(),
  sanPhamId: z.string(),
  maHang: z.string(),
  ten: z.string(),
  donViTen: z.string(),
  heSo: z.number().int().min(1),
  soLuongDaNhap: z.number().int(),
  conLaiToiDa: z.number().int(),
});

export const PhieuNhapDeTraHangNhapResSchema = z.object({
  id: z.string(),
  ma: z.string(),
  thoiGian: z.string(),
  dong: z.array(PhieuNhapDongDeTraHangNhapItemSchema),
});

export type TraHangNhapDongReq = z.infer<typeof TraHangNhapDongReqSchema>;
export type TaoTraHangNhapReq = z.infer<typeof TaoTraHangNhapReqSchema>;
export type TraHangNhapRes = z.infer<typeof TraHangNhapResSchema>;
export type TraHangNhapDanhSachItem = z.infer<typeof TraHangNhapDanhSachItemSchema>;
export type DanhSachTraHangNhapRes = z.infer<typeof DanhSachTraHangNhapResSchema>;
export type TraHangNhapChiTietRes = z.infer<typeof TraHangNhapChiTietResSchema>;
export type PhieuNhapDongDeTraHangNhapItem = z.infer<typeof PhieuNhapDongDeTraHangNhapItemSchema>;
export type PhieuNhapDeTraHangNhapRes = z.infer<typeof PhieuNhapDeTraHangNhapResSchema>;
