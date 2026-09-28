import { z } from 'zod';
import { HoaDonDongReqSchema, PhuongThucThanhToanSchema } from './hoa-don';

// Hợp đồng đồng bộ hàng đợi thao tác offline (T-033, SPEC.md §5.2/§5.4). Máy
// chủ nhận một lô thao tác theo đúng thứ tự client gửi lên (client đã giữ FIFO
// từ T-031) và áp dụng lần lượt, idempotent theo `id` (ULID của thao tác trong
// hàng đợi client).
//
// Chỉ có loại BAN_HANG ở slice này — offline chỉ chạy bán hàng và trả hàng
// (SPEC.md §5.1), nhưng lõi nghiệp vụ trả hàng (T-052a) chưa tồn tại. Khi đó
// thêm một biến thể nữa vào `ThaoTacDongBoSchema` (hiện đang bằng
// `ThaoTacBanHangOfflineSchema`, sẽ đổi thành `z.discriminatedUnion('loai', [...])`),
// không viết lại khuôn chung này.
export const ThaoTacBanHangOfflineSchema = z.object({
  loai: z.literal('BAN_HANG'),
  /** ULID của thao tác trong hàng đợi client (T-031) — dùng làm `hoa_don.id`, nền tảng idempotency. */
  id: z.string().min(1),
  /** Mã hoá đơn đã cấp tại client khi offline (T-032, dạng HD<mã máy>-NNNNNN). */
  maHoaDon: z.string().min(1),
  /** Giờ thiết bị lúc bán (ISO) — sao chép, không phải giờ máy chủ nhận (SPEC.md §3.6). */
  thoiGian: z.string().min(1),
  phuongThucThanhToan: PhuongThucThanhToanSchema,
  giamGia: z.number().int().nonnegative().optional(),
  thuKhac: z.number().int().nonnegative().optional(),
  dong: z.array(HoaDonDongReqSchema).min(1),
});

export const ThaoTacDongBoSchema = ThaoTacBanHangOfflineSchema;

export const DongBoThaoTacReqSchema = z.object({
  thaoTac: z.array(ThaoTacDongBoSchema).min(1),
});

export const KetQuaThaoTacSchema = z.object({
  id: z.string(),
  ketQua: z.enum(['DA_AP_DUNG', 'DA_TON_TAI', 'LOI']),
  loi: z.string().optional(),
});

export const DongBoThaoTacResSchema = z.object({
  ketQua: z.array(KetQuaThaoTacSchema),
});

export type ThaoTacBanHangOffline = z.infer<typeof ThaoTacBanHangOfflineSchema>;
export type ThaoTacDongBo = z.infer<typeof ThaoTacDongBoSchema>;
export type DongBoThaoTacReq = z.infer<typeof DongBoThaoTacReqSchema>;
export type KetQuaThaoTac = z.infer<typeof KetQuaThaoTacSchema>;
export type DongBoThaoTacRes = z.infer<typeof DongBoThaoTacResSchema>;
