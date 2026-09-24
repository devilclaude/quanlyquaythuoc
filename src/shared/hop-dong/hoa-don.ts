import { z } from 'zod';

// Hợp đồng API dùng chung client/server (ARCHITECTURE.md §1) cho T-022b —
// tạo hoá đơn từ giỏ hàng. Tiền và số lượng đều `z.number().int()`: SPEC.md
// §3.4/§3.3 cấm số thực cho tiền và số lượng ở mọi tầng, kể cả JSON truyền đi.

// Danh sách giá trị buộc khớp với `PhuongThucThanhToan`
// (src/server/ban-hang/tao-hoa-don.ts) tại thời điểm biên dịch.
export const PhuongThucThanhToanSchema = z.enum(['TIEN_MAT', 'CHUYEN_KHOAN', 'THE', 'VI']);

// Một dòng giỏ hàng: đơn vị/hệ số/đơn giá do client gửi lên là bản sao chép
// tại thời điểm bán (SPEC.md §5.4 "chứng từ sao chép giá lúc bán, không tham
// chiếu") — không phải server tra lại `don_vi_tinh`, vì màn bán hàng (T-020/
// T-021) đã hiển thị đúng các giá trị này cho người bán chọn.
export const HoaDonDongReqSchema = z.object({
  sanPhamId: z.string().min(1),
  donViTen: z.string().min(1),
  heSo: z.number().int().min(1),
  donGia: z.number().int().nonnegative(),
  soLuong: z.number().int().positive(),
  /** Ghi đè FEFO — chọn lô thủ công (SPEC.md §4.1). */
  loUuTienThuCong: z.array(z.string()).optional(),
});

// Không có `lamTron`: mặc định TẮT và chưa có giao diện bật (T-022c) — API
// lớp này chưa mở khoá knob đó (BACKLOG.md "Xong khi" T-022a).
export const TaoHoaDonReqSchema = z.object({
  phuongThucThanhToan: PhuongThucThanhToanSchema,
  giamGia: z.number().int().nonnegative().optional(),
  thuKhac: z.number().int().nonnegative().optional(),
  dong: z.array(HoaDonDongReqSchema).min(1),
});

export const HoaDonResSchema = z.object({
  id: z.string(),
  ma: z.string(),
  tongTienHang: z.number().int(),
  giamGia: z.number().int(),
  thuKhac: z.number().int(),
  lamTron: z.number().int(),
  khachCanTra: z.number().int(),
});

export type PhuongThucThanhToan = z.infer<typeof PhuongThucThanhToanSchema>;
export type HoaDonDongReq = z.infer<typeof HoaDonDongReqSchema>;
export type TaoHoaDonReq = z.infer<typeof TaoHoaDonReqSchema>;
export type HoaDonRes = z.infer<typeof HoaDonResSchema>;
