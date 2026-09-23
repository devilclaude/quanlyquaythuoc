import { z } from 'zod';
import type { GhiDeQuanLyLo } from '../cai-dat/giai-nghia';

// Hợp đồng API dùng chung client/server (ARCHITECTURE.md §1) cho T-010b —
// API cài đặt "quản lý theo lô".

// Danh sách giá trị buộc khớp với `GhiDeQuanLyLo` (src/shared/cai-dat/giai-nghia.ts)
// tại thời điểm biên dịch — đổi một bên mà quên bên kia là lỗi kiểu, không phải
// lỗi runtime phát hiện muộn.
const GIA_TRI_GHI_DE_QUAN_LY_LO = ['KE_THUA', 'BAT', 'TAT'] as const satisfies readonly GhiDeQuanLyLo[];

export const GhiDeQuanLyLoSchema = z.enum(GIA_TRI_GHI_DE_QUAN_LY_LO);

export const CaiDatToanCucResSchema = z.object({
  /** Cài đặt "quản lý theo lô" toàn cục — mặc định TẮT (SPEC.md §3.2). */
  bat: z.boolean(),
});

export const DoiCaiDatToanCucReqSchema = z.object({
  bat: z.boolean(),
});

export const DoiGhiDeSanPhamReqSchema = z.object({
  ghiDe: GhiDeQuanLyLoSchema,
});

export type CaiDatToanCucRes = z.infer<typeof CaiDatToanCucResSchema>;
export type DoiCaiDatToanCucReq = z.infer<typeof DoiCaiDatToanCucReqSchema>;
export type DoiGhiDeSanPhamReq = z.infer<typeof DoiGhiDeSanPhamReqSchema>;
