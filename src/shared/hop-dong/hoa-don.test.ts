import { describe, expect, it } from 'vitest';
import { HoaDonDongReqSchema, HoaDonResSchema, TaoHoaDonReqSchema } from './hoa-don';

const dongMau = {
  sanPhamId: 'sp-1',
  donViTen: 'Vỉ',
  heSo: 12,
  donGia: 17_000,
  soLuong: 3,
};

describe('HoaDonDongReqSchema', () => {
  it('chấp nhận một dòng hợp lệ', () => {
    expect(() => HoaDonDongReqSchema.parse(dongMau)).not.toThrow();
  });

  it('từ chối hệ số nhỏ hơn 1 (SPEC.md §3.3)', () => {
    expect(() => HoaDonDongReqSchema.parse({ ...dongMau, heSo: 0 })).toThrow();
  });

  it('từ chối đơn giá là số thực — tiền phải là số nguyên (SPEC.md §3.4)', () => {
    expect(() => HoaDonDongReqSchema.parse({ ...dongMau, donGia: 17_000.5 })).toThrow();
  });

  it('từ chối số lượng 0 hoặc âm', () => {
    expect(() => HoaDonDongReqSchema.parse({ ...dongMau, soLuong: 0 })).toThrow();
    expect(() => HoaDonDongReqSchema.parse({ ...dongMau, soLuong: -1 })).toThrow();
  });

  it('từ chối số lượng không nguyên', () => {
    expect(() => HoaDonDongReqSchema.parse({ ...dongMau, soLuong: 1.5 })).toThrow();
  });

  it('chấp nhận loUuTienThuCong tuỳ chọn (chọn lô thủ công, SPEC.md §4.1)', () => {
    const ketQua = HoaDonDongReqSchema.parse({ ...dongMau, loUuTienThuCong: ['lo-1', 'lo-2'] });
    expect(ketQua.loUuTienThuCong).toEqual(['lo-1', 'lo-2']);
  });
});

const yeuCauMau = {
  phuongThucThanhToan: 'TIEN_MAT',
  dong: [dongMau],
};

describe('TaoHoaDonReqSchema', () => {
  it('chấp nhận yêu cầu tối thiểu — giảm giá/thu khác mặc định không truyền', () => {
    const ketQua = TaoHoaDonReqSchema.parse(yeuCauMau);
    expect(ketQua.giamGia).toBeUndefined();
    expect(ketQua.thuKhac).toBeUndefined();
  });

  it('chấp nhận bốn phương thức thanh toán', () => {
    for (const pt of ['TIEN_MAT', 'CHUYEN_KHOAN', 'THE', 'VI']) {
      expect(() => TaoHoaDonReqSchema.parse({ ...yeuCauMau, phuongThucThanhToan: pt })).not.toThrow();
    }
  });

  it('từ chối phương thức thanh toán ngoài bốn giá trị', () => {
    expect(() => TaoHoaDonReqSchema.parse({ ...yeuCauMau, phuongThucThanhToan: 'TIEN_AO' })).toThrow();
  });

  it('từ chối giỏ hàng rỗng — chặn ngay ở hợp đồng, không cần chạm nghiệp vụ', () => {
    expect(() => TaoHoaDonReqSchema.parse({ ...yeuCauMau, dong: [] })).toThrow();
  });

  it('từ chối giảm giá hoặc thu khác âm', () => {
    expect(() => TaoHoaDonReqSchema.parse({ ...yeuCauMau, giamGia: -1 })).toThrow();
    expect(() => TaoHoaDonReqSchema.parse({ ...yeuCauMau, thuKhac: -1 })).toThrow();
  });

  it('không có trường lamTron — mặc định tắt, chưa có giao diện bật (T-022c)', () => {
    const ketQua: Record<string, unknown> = TaoHoaDonReqSchema.parse({ ...yeuCauMau, lamTron: 500 });
    expect('lamTron' in ketQua).toBe(false);
  });
});

describe('HoaDonResSchema', () => {
  it('chấp nhận kết quả hợp lệ', () => {
    expect(() =>
      HoaDonResSchema.parse({
        id: 'hd-1',
        ma: 'HD000001',
        tongTienHang: 51_000,
        giamGia: 0,
        thuKhac: 0,
        lamTron: 0,
        khachCanTra: 51_000,
      }),
    ).not.toThrow();
  });

  it('từ chối khách cần trả là số thực', () => {
    expect(() =>
      HoaDonResSchema.parse({
        id: 'hd-1',
        ma: 'HD000001',
        tongTienHang: 51_000,
        giamGia: 0,
        thuKhac: 0,
        lamTron: 0,
        khachCanTra: 51_000.5,
      }),
    ).toThrow();
  });
});
