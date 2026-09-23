import { z } from 'zod';
import { GhiDeQuanLyLoSchema } from './cai-dat';

// Hợp đồng API dùng chung client/server (ARCHITECTURE.md §1) cho T-009a — màn
// hàng hoá chỉ đọc. Tiền và số lượng đều `z.number().int()`: SPEC.md §3.4/§3.3
// cấm số thực cho tiền và số lượng ở mọi tầng, kể cả JSON truyền đi.

export const DonViTinhResSchema = z.object({
  id: z.string(),
  ten: z.string(),
  heSo: z.number().int().min(1),
  laCoSo: z.boolean(),
  giaBan: z.number().int().nonnegative(),
});

export const HangHoaDanhSachItemSchema = z.object({
  id: z.string(),
  maHang: z.string(),
  ten: z.string(),
  /** Giá bán đơn vị cơ sở. */
  giaBan: z.number().int().nonnegative(),
  /** Tạm luôn 0 cho tới khi T-007 (giá vốn bình quân gia quyền) merge. */
  giaVon: z.number().int().nonnegative(),
  /** Tổng tồn ở đơn vị cơ sở, cộng dồn mọi lô của sản phẩm. */
  tonKho: z.number().int(),
  ngayTao: z.string(),
  /**
   * Mọi đơn vị tính của sản phẩm — màn bán hàng (T-020) cần giá và hệ số
   * từng đơn vị ngay trong danh sách tìm kiếm để dựng gợi ý một dòng mỗi
   * đơn vị, không phải gọi thêm API chi tiết cho từng gợi ý.
   */
  donViTinh: z.array(DonViTinhResSchema),
});

export const DanhSachHangHoaResSchema = z.object({
  duLieu: z.array(HangHoaDanhSachItemSchema),
});

export const HangHoaChiTietResSchema = HangHoaDanhSachItemSchema.extend({
  donViTinh: z.array(DonViTinhResSchema),
  /** "Ngừng hoạt động" thay xoá cứng khi đã phát sinh thẻ kho (SPEC.md §3.5, T-009c). */
  trangThai: z.enum(['HOAT_DONG', 'NGUNG_HOAT_DONG']),
  /** true khi CHƯA phát sinh dòng thẻ kho nào — quyết định nút Xoá hay Ngừng hoạt động. */
  coTheXoaCung: z.boolean(),
  /** Ghi đè cài đặt "quản lý theo lô" riêng cho sản phẩm này (T-010b, SPEC.md §3.2). */
  quanLyLoGhiDe: GhiDeQuanLyLoSchema,
});

export type DonViTinhRes = z.infer<typeof DonViTinhResSchema>;
export type HangHoaDanhSachItem = z.infer<typeof HangHoaDanhSachItemSchema>;
export type DanhSachHangHoaRes = z.infer<typeof DanhSachHangHoaResSchema>;
export type HangHoaChiTietRes = z.infer<typeof HangHoaChiTietResSchema>;

// Hợp đồng tạo mới hàng hoá (T-009b). Chỉ các trường trong phạm vi v1 — xem
// "Xong khi" T-009b trong BACKLOG.md: không có nhóm hàng, ảnh, thuộc tính, vị
// trí, trọng lượng, hãng/nước sản xuất, định mức tồn, tồn kho ban đầu (tồn vào
// qua phiếu nhập — T-040 — không phải lúc tạo hàng hoá).
export const TaoDonViKhacReqSchema = z.object({
  ten: z.string().trim().min(1),
  /** Hệ số quy đổi so với đơn vị cơ sở (SPEC.md §3.3: số nguyên ≥ 1). */
  heSo: z.number().int().min(1),
  giaBan: z.number().int().nonnegative(),
});

export const TaoHangHoaReqSchema = z.object({
  /** Bỏ trống thì server tự sinh (form ghi "Tự động"). */
  maHang: z.string().trim().min(1).optional(),
  ten: z.string().trim().min(1),
  donViCoSoTen: z.string().trim().min(1),
  giaBan: z.number().int().nonnegative(),
  donViKhac: z.array(TaoDonViKhacReqSchema).default([]),
});

export type TaoDonViKhacReq = z.infer<typeof TaoDonViKhacReqSchema>;
export type TaoHangHoaReq = z.infer<typeof TaoHangHoaReqSchema>;

// Hợp đồng sửa hàng hoá (T-009c). Không có `maHang` — mã hàng không đổi được
// trong phạm vi task này (BACKLOG.md "Xong khi" T-009c chỉ nói "sửa tên/giá/
// đơn vị"). Đơn vị khác dùng ngữ nghĩa THAY THẾ TOÀN BỘ danh sách hiện có —
// khớp cách form tái dùng từ form tạo (T-009b) build lại toàn bộ mảng mỗi lần
// lưu; an toàn vì `don_vi_tinh` không phải sổ cái, không bên nào tham chiếu id
// của nó (thẻ kho ghi theo lô, không theo đơn vị tính).
export const SuaHangHoaReqSchema = z.object({
  ten: z.string().trim().min(1),
  donViCoSoTen: z.string().trim().min(1),
  giaBan: z.number().int().nonnegative(),
  donViKhac: z.array(TaoDonViKhacReqSchema).default([]),
});

export type SuaHangHoaReq = z.infer<typeof SuaHangHoaReqSchema>;
