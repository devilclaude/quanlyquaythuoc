import { describe, expect, it } from 'vitest';
import { DongBoThaoTacReqSchema, DongBoThaoTacResSchema, ThaoTacBanHangOfflineSchema } from './dong-bo';

const dongMau = {
  sanPhamId: 'sp-1',
  donViTen: 'Vỉ',
  heSo: 12,
  donGia: 17_000,
  soLuong: 3,
};

const thaoTacMau = {
  loai: 'BAN_HANG',
  id: '01J000000000000000000000',
  maHoaDon: 'HDABC123-000001',
  thoiGian: '2026-09-21T08:00:00.000Z',
  phuongThucThanhToan: 'TIEN_MAT',
  dong: [dongMau],
};

describe('ThaoTacBanHangOfflineSchema', () => {
  it('chấp nhận một thao tác hợp lệ', () => {
    expect(() => ThaoTacBanHangOfflineSchema.parse(thaoTacMau)).not.toThrow();
  });

  it('từ chối loai khác BAN_HANG', () => {
    expect(() => ThaoTacBanHangOfflineSchema.parse({ ...thaoTacMau, loai: 'TRA_HANG' })).toThrow();
  });

  it('từ chối thiếu maHoaDon — đơn offline bắt buộc đã có mã cấp tại client (SPEC.md §5.3)', () => {
    const thieuMa = {
      loai: thaoTacMau.loai,
      id: thaoTacMau.id,
      thoiGian: thaoTacMau.thoiGian,
      phuongThucThanhToan: thaoTacMau.phuongThucThanhToan,
      dong: thaoTacMau.dong,
    };
    expect(() => ThaoTacBanHangOfflineSchema.parse(thieuMa)).toThrow();
  });

  it('từ chối giỏ hàng rỗng — chặn ngay ở hợp đồng', () => {
    expect(() => ThaoTacBanHangOfflineSchema.parse({ ...thaoTacMau, dong: [] })).toThrow();
  });
});

describe('DongBoThaoTacReqSchema', () => {
  it('chấp nhận danh sách một thao tác', () => {
    const ketQua = DongBoThaoTacReqSchema.parse({ thaoTac: [thaoTacMau] });
    expect(ketQua.thaoTac).toHaveLength(1);
  });

  it('từ chối danh sách rỗng', () => {
    expect(() => DongBoThaoTacReqSchema.parse({ thaoTac: [] })).toThrow();
  });
});

describe('DongBoThaoTacResSchema', () => {
  it('chấp nhận ba loại kết quả: DA_AP_DUNG, DA_TON_TAI, LOI', () => {
    const ketQua = {
      ketQua: [
        { id: 'tt-1', ketQua: 'DA_AP_DUNG' },
        { id: 'tt-2', ketQua: 'DA_TON_TAI' },
        { id: 'tt-3', ketQua: 'LOI', loi: 'giỏ hàng rỗng' },
      ],
    };
    expect(() => DongBoThaoTacResSchema.parse(ketQua)).not.toThrow();
  });

  it('từ chối kết quả ngoài ba giá trị', () => {
    expect(() => DongBoThaoTacResSchema.parse({ ketQua: [{ id: 'tt-1', ketQua: 'KHONG_RO' }] })).toThrow();
  });
});
