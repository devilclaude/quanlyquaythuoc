import { z } from 'zod';

export const VaiTroSchema = z.enum(['ADMIN', 'NHAN_VIEN']);
export type VaiTro = z.infer<typeof VaiTroSchema>;

export const NguoiDungSchema = z.object({
  id: z.string().min(1),
  tenDangNhap: z.string().min(1),
  tenHienThi: z.string().min(1),
  vaiTro: VaiTroSchema,
});
export type NguoiDungHienTai = z.infer<typeof NguoiDungSchema>;

export const DangNhapReqSchema = z.object({
  tenDangNhap: z.string().min(1),
  matKhau: z.string().min(1),
});
export type DangNhapReq = z.infer<typeof DangNhapReqSchema>;
