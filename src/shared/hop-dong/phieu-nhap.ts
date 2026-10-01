import { z } from 'zod';

// Hợp đồng API dùng chung client/server (ARCHITECTURE.md §1) cho T-040b — phiếu
// nhập. Tiền và số lượng đều `z.number().int()`: SPEC.md §3.4/§3.3 cấm số thực
// cho tiền và số lượng ở mọi tầng, kể cả JSON truyền đi.

// Danh sách giá trị buộc khớp với `TrangThaiPhieuNhap`
// (src/server/nhap-hang/tao-phieu-nhap.ts) tại thời điểm biên dịch.
export const TrangThaiPhieuNhapSchema = z.enum(['PHIEU_TAM', 'HOAN_THANH']);

// Một dòng nhập: đơn vị/hệ số/đơn giá là bản sao chép tại thời điểm nhập
// (SPEC.md §5.4 "chứng từ sao chép giá lúc nhập, không tham chiếu"), không
// tham chiếu lại `don_vi_tinh`. `soLo`/`hsd` là LÔ MONG MUỐN — cho phép bỏ
// trống khi sản phẩm tắt quản lý lô (SPEC.md §3.2); bắt buộc cả hai hay
// không, và get-or-create lô thật, do lõi nghiệp vụ tự quyết lúc Hoàn thành,
// không phải ở tầng hợp đồng này.
export const PhieuNhapDongReqSchema = z.object({
  sanPhamId: z.string().min(1),
  donViTen: z.string().min(1),
  heSo: z.number().int().min(1),
  donGia: z.number().int().nonnegative(),
  soLuong: z.number().int().positive(),
  soLo: z.string().trim().min(1).nullable().optional(),
  hsd: z.string().trim().min(1).nullable().optional(),
});

export const TaoPhieuNhapReqSchema = z.object({
  /** true = hoàn thành ngay (ghi kho ngay); mặc định false = lưu tạm, không ghi kho. */
  hoanThanhNgay: z.boolean().optional(),
  dong: z.array(PhieuNhapDongReqSchema).min(1),
});

// Sửa dòng khi phiếu còn `PHIEU_TAM` — ngữ nghĩa THAY THẾ TOÀN BỘ, cùng khuôn
// với đơn vị tính khác của hàng hoá (`SuaHangHoaReqSchema`, T-009c).
export const SuaPhieuNhapReqSchema = z.object({
  dong: z.array(PhieuNhapDongReqSchema).min(1),
});

export const PhieuNhapDongResSchema = z.object({
  id: z.string(),
  sanPhamId: z.string(),
  /** Mã/tên sản phẩm HIỆN TẠI, tra lúc đọc — không snapshot (xem ghi chú trong `tao-phieu-nhap.ts`). */
  maHang: z.string(),
  ten: z.string(),
  donViTen: z.string(),
  heSo: z.number().int(),
  donGia: z.number().int(),
  soLuong: z.number().int(),
  soLo: z.string().nullable(),
  hsd: z.string().nullable(),
});

export const PhieuNhapResSchema = z.object({
  id: z.string(),
  ma: z.string(),
  trangThai: TrangThaiPhieuNhapSchema,
});

export const PhieuNhapDanhSachItemSchema = z.object({
  id: z.string(),
  ma: z.string(),
  chiNhanhId: z.string(),
  trangThai: TrangThaiPhieuNhapSchema,
  /** Giờ thiết bị lúc thao tác xảy ra (ISO). */
  thoiGian: z.string(),
  /** Tổng tiền hàng = Σ (đơn giá × số lượng) các dòng (T-041) — không phải "Cần trả NCC" (chưa có công nợ NCC, v1.1). */
  tongTien: z.number().int(),
});

export const DanhSachPhieuNhapResSchema = z.object({
  duLieu: z.array(PhieuNhapDanhSachItemSchema),
});

export const PhieuNhapChiTietResSchema = PhieuNhapDanhSachItemSchema.extend({
  dong: z.array(PhieuNhapDongResSchema),
});

export type TrangThaiPhieuNhap = z.infer<typeof TrangThaiPhieuNhapSchema>;
export type PhieuNhapDongReq = z.infer<typeof PhieuNhapDongReqSchema>;
export type TaoPhieuNhapReq = z.infer<typeof TaoPhieuNhapReqSchema>;
export type SuaPhieuNhapReq = z.infer<typeof SuaPhieuNhapReqSchema>;
export type PhieuNhapRes = z.infer<typeof PhieuNhapResSchema>;
export type PhieuNhapDanhSachItem = z.infer<typeof PhieuNhapDanhSachItemSchema>;
export type DanhSachPhieuNhapRes = z.infer<typeof DanhSachPhieuNhapResSchema>;
export type PhieuNhapChiTietRes = z.infer<typeof PhieuNhapChiTietResSchema>;
