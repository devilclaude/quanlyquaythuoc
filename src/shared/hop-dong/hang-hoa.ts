import { z } from 'zod';

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
});

export const DanhSachHangHoaResSchema = z.object({
  duLieu: z.array(HangHoaDanhSachItemSchema),
});

export const HangHoaChiTietResSchema = HangHoaDanhSachItemSchema.extend({
  donViTinh: z.array(DonViTinhResSchema),
});

export type DonViTinhRes = z.infer<typeof DonViTinhResSchema>;
export type HangHoaDanhSachItem = z.infer<typeof HangHoaDanhSachItemSchema>;
export type DanhSachHangHoaRes = z.infer<typeof DanhSachHangHoaResSchema>;
export type HangHoaChiTietRes = z.infer<typeof HangHoaChiTietResSchema>;
