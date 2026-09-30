import { z } from 'zod';

// Hợp đồng API dùng chung client/server (ARCHITECTURE.md §1) cho T-034 — cảnh
// báo lệch kho hiện ở màn Tổng quan.

export const CanhBaoLechKhoSchema = z.object({
  loId: z.string(),
  chiNhanhId: z.string(),
  sanPhamId: z.string(),
  maHang: z.string(),
  tenSanPham: z.string(),
  soLo: z.string().nullable(),
  hsd: z.string().nullable(),
  /** Luôn âm — số tồn thực nhỏ hơn 0, đơn vị cơ sở (SPEC.md §4.4). */
  ton: z.number(),
});

export const CanhBaoLechKhoResSchema = z.object({
  canhBao: z.array(CanhBaoLechKhoSchema),
});

export type CanhBaoLechKho = z.infer<typeof CanhBaoLechKhoSchema>;
export type CanhBaoLechKhoRes = z.infer<typeof CanhBaoLechKhoResSchema>;
