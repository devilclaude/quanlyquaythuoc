import { z } from 'zod';
import { PhieuNhapResSchema } from './phieu-nhap';

// Hợp đồng API cho T-043 — nhập hàng từ file Excel (SPEC.md §6.2, §8 không áp
// dụng: đây là file MẪU DO PHẦN MỀM NÀY TỰ ĐỊNH NGHĨA, không phải bản xuất
// KiotViet thật, nên không cần chờ mẫu thật như T-060).

export const LoiDongNhapExcelSchema = z.object({
  /** Số thứ tự dòng dữ liệu, 1-based, KHÔNG tính dòng tiêu đề. `0` nghĩa là lỗi
   * của CẢ FILE (sai tiêu đề, không đọc được, không có dòng dữ liệu nào) —
   * không quy được về một dòng cụ thể. */
  dong: z.number().int().nonnegative(),
  thongDiep: z.string(),
});

// Toàn file là một khối: hoặc tạo được phiếu (đã hoàn thành, đã ghi kho), hoặc
// không ghi gì cả kèm danh sách lỗi theo dòng (CLAUDE.md: "file lỗi không làm
// hỏng kho — hoặc vào hết hoặc không vào gì").
export const KetQuaNhapTuExcelResSchema = z.discriminatedUnion('thanhCong', [
  z.object({ thanhCong: z.literal(true), phieu: PhieuNhapResSchema }),
  z.object({ thanhCong: z.literal(false), loi: z.array(LoiDongNhapExcelSchema).min(1) }),
]);

export type LoiDongNhapExcel = z.infer<typeof LoiDongNhapExcelSchema>;
export type KetQuaNhapTuExcelRes = z.infer<typeof KetQuaNhapTuExcelResSchema>;
