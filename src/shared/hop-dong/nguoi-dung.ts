import { z } from 'zod';
import { VaiTroSchema } from './auth';

// Hợp đồng API quản lý người dùng (chỉ admin) — Phần 3 đăng nhập/phân quyền.

export const NguoiDungQuanLySchema = z.object({
  id: z.string(),
  tenDangNhap: z.string(),
  tenHienThi: z.string(),
  vaiTro: VaiTroSchema,
  hoatDong: z.boolean(),
  ngayTao: z.string(),
});
export type NguoiDungQuanLyRes = z.infer<typeof NguoiDungQuanLySchema>;

export const DanhSachNguoiDungResSchema = z.object({
  duLieu: z.array(NguoiDungQuanLySchema),
});

export const TaoNguoiDungReqSchema = z.object({
  tenDangNhap: z.string().trim().min(1),
  tenHienThi: z.string().trim().min(1),
  matKhau: z.string().min(1),
  vaiTro: VaiTroSchema,
});
export type TaoNguoiDungReq = z.infer<typeof TaoNguoiDungReqSchema>;

export const CapNhatNguoiDungReqSchema = z
  .object({
    tenHienThi: z.string().trim().min(1).optional(),
    vaiTro: VaiTroSchema.optional(),
    hoatDong: z.boolean().optional(),
  })
  .refine((v) => v.tenHienThi !== undefined || v.vaiTro !== undefined || v.hoatDong !== undefined, {
    message: 'Cần ít nhất một trường để cập nhật',
  });
export type CapNhatNguoiDungReq = z.infer<typeof CapNhatNguoiDungReqSchema>;

export const DatLaiMatKhauReqSchema = z.object({
  matKhau: z.string().min(1),
});
export type DatLaiMatKhauReq = z.infer<typeof DatLaiMatKhauReqSchema>;
