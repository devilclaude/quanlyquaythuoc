import { describe, expect, it } from 'vitest';
import {
  DanhSachPhieuNhapResSchema,
  PhieuNhapChiTietResSchema,
  PhieuNhapDongReqSchema,
  PhieuNhapResSchema,
  SuaPhieuNhapReqSchema,
  TaoPhieuNhapReqSchema,
} from './phieu-nhap';

const dongMau = {
  sanPhamId: 'sp-1',
  donViTen: 'hộp',
  heSo: 180,
  donGia: 260_000,
  soLuong: 5,
};

describe('PhieuNhapDongReqSchema', () => {
  it('chấp nhận một dòng hợp lệ không khai lô', () => {
    const ketQua = PhieuNhapDongReqSchema.parse(dongMau);
    expect(ketQua.soLo).toBeUndefined();
    expect(ketQua.hsd).toBeUndefined();
  });

  it('chấp nhận lô/HSD tường minh', () => {
    const ketQua = PhieuNhapDongReqSchema.parse({ ...dongMau, soLo: 'L01', hsd: '2027-01-01' });
    expect(ketQua.soLo).toBe('L01');
    expect(ketQua.hsd).toBe('2027-01-01');
  });

  it('chấp nhận lô/HSD null (sản phẩm tắt quản lý lô)', () => {
    const ketQua = PhieuNhapDongReqSchema.parse({ ...dongMau, soLo: null, hsd: null });
    expect(ketQua.soLo).toBeNull();
    expect(ketQua.hsd).toBeNull();
  });

  it('từ chối hệ số nhỏ hơn 1 (SPEC.md §3.3)', () => {
    expect(() => PhieuNhapDongReqSchema.parse({ ...dongMau, heSo: 0 })).toThrow();
  });

  it('từ chối đơn giá là số thực — tiền phải là số nguyên (SPEC.md §3.4)', () => {
    expect(() => PhieuNhapDongReqSchema.parse({ ...dongMau, donGia: 260_000.5 })).toThrow();
  });

  it('từ chối số lượng 0 hoặc âm', () => {
    expect(() => PhieuNhapDongReqSchema.parse({ ...dongMau, soLuong: 0 })).toThrow();
    expect(() => PhieuNhapDongReqSchema.parse({ ...dongMau, soLuong: -1 })).toThrow();
  });

  it('từ chối số lượng không nguyên', () => {
    expect(() => PhieuNhapDongReqSchema.parse({ ...dongMau, soLuong: 1.5 })).toThrow();
  });
});

const yeuCauMau = { dong: [dongMau] };

describe('TaoPhieuNhapReqSchema', () => {
  it('chấp nhận yêu cầu tối thiểu — hoanThanhNgay mặc định không truyền', () => {
    const ketQua = TaoPhieuNhapReqSchema.parse(yeuCauMau);
    expect(ketQua.hoanThanhNgay).toBeUndefined();
  });

  it('chấp nhận hoanThanhNgay tường minh', () => {
    const ketQua = TaoPhieuNhapReqSchema.parse({ ...yeuCauMau, hoanThanhNgay: true });
    expect(ketQua.hoanThanhNgay).toBe(true);
  });

  it('từ chối danh sách dòng rỗng — chặn ngay ở hợp đồng, không cần chạm nghiệp vụ', () => {
    expect(() => TaoPhieuNhapReqSchema.parse({ dong: [] })).toThrow();
  });
});

describe('SuaPhieuNhapReqSchema', () => {
  it('chấp nhận danh sách dòng thay thế hợp lệ', () => {
    expect(() => SuaPhieuNhapReqSchema.parse({ dong: [dongMau] })).not.toThrow();
  });

  it('từ chối danh sách dòng rỗng', () => {
    expect(() => SuaPhieuNhapReqSchema.parse({ dong: [] })).toThrow();
  });
});

describe('PhieuNhapResSchema', () => {
  it('chấp nhận kết quả hợp lệ', () => {
    expect(() => PhieuNhapResSchema.parse({ id: 'pn-1', ma: 'PN000001', trangThai: 'PHIEU_TAM' })).not.toThrow();
  });

  it('từ chối trạng thái ngoài hai giá trị hợp lệ', () => {
    expect(() => PhieuNhapResSchema.parse({ id: 'pn-1', ma: 'PN000001', trangThai: 'DA_HUY' })).toThrow();
  });
});

describe('DanhSachPhieuNhapResSchema', () => {
  it('chấp nhận danh sách rỗng', () => {
    expect(() => DanhSachPhieuNhapResSchema.parse({ duLieu: [] })).not.toThrow();
  });

  it('chấp nhận danh sách có phiếu', () => {
    const duLieu = [{ id: 'pn-1', ma: 'PN000001', chiNhanhId: 'cn-1', trangThai: 'PHIEU_TAM', thoiGian: '2026-09-27T07:00:00.000Z' }];
    expect(() => DanhSachPhieuNhapResSchema.parse({ duLieu })).not.toThrow();
  });
});

describe('PhieuNhapChiTietResSchema', () => {
  it('chấp nhận chi tiết kèm dòng có lô/HSD null', () => {
    expect(() =>
      PhieuNhapChiTietResSchema.parse({
        id: 'pn-1',
        ma: 'PN000001',
        chiNhanhId: 'cn-1',
        trangThai: 'HOAN_THANH',
        thoiGian: '2026-09-27T07:00:00.000Z',
        dong: [
          {
            id: 'pnd-1',
            sanPhamId: 'sp-1',
            donViTen: 'hộp',
            heSo: 180,
            donGia: 260_000,
            soLuong: 5,
            soLo: null,
            hsd: null,
          },
        ],
      }),
    ).not.toThrow();
  });
});
