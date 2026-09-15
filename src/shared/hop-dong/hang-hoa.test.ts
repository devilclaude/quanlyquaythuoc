import { describe, expect, it } from 'vitest';
import {
  DanhSachHangHoaResSchema,
  HangHoaChiTietResSchema,
} from './hang-hoa';

const mucDonVi = { id: 'dvt-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 };

const mucDanhSach = {
  id: 'sp-1',
  maHang: 'SP001',
  ten: 'Paracetamol 500mg',
  giaBan: 500,
  giaVon: 0,
  tonKho: 864,
  ngayTao: '2026-09-15T08:00:00.000Z',
};

describe('DanhSachHangHoaResSchema', () => {
  it('chấp nhận danh sách hợp lệ', () => {
    expect(() =>
      DanhSachHangHoaResSchema.parse({ duLieu: [mucDanhSach] }),
    ).not.toThrow();
  });

  it('từ chối giá bán là số thực — tiền phải là số nguyên (SPEC.md §3.4)', () => {
    expect(() =>
      DanhSachHangHoaResSchema.parse({ duLieu: [{ ...mucDanhSach, giaBan: 500.5 }] }),
    ).toThrow();
  });

  it('từ chối thiếu trường bắt buộc', () => {
    const thieuTen: Record<string, unknown> = { ...mucDanhSach };
    delete thieuTen['ten'];
    expect(() => DanhSachHangHoaResSchema.parse({ duLieu: [thieuTen] })).toThrow();
  });
});

describe('HangHoaChiTietResSchema', () => {
  it('chấp nhận chi tiết hợp lệ kèm danh sách đơn vị tính', () => {
    expect(() =>
      HangHoaChiTietResSchema.parse({ ...mucDanhSach, donViTinh: [mucDonVi] }),
    ).not.toThrow();
  });

  it('từ chối hệ số nhỏ hơn 1 (SPEC.md §3.3)', () => {
    expect(() =>
      HangHoaChiTietResSchema.parse({
        ...mucDanhSach,
        donViTinh: [{ ...mucDonVi, heSo: 0 }],
      }),
    ).toThrow();
  });
});
