import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  InTemMa,
  boDauTiengViet,
  suaSoLuongTem,
  tongSoLuongTem,
  trieuKhaiDsTem,
  xayDungDsTemTuPhieuNhap,
  xoaDongTem,
  type DongPhieuNhapChoTem,
  type DongTemUI,
} from './InTemMa';

const dongPhieuNhapMau: DongPhieuNhapChoTem[] = [
  {
    id: 'd1',
    maHang: 'SP000125',
    ten: 'Betaloc 50mg',
    donViTinhId: 'dvt-hop',
    donViTen: 'hộp',
    soLuong: 2,
    dsDonVi: [
      { id: 'dvt-vien', giaBan: 10_000 },
      { id: 'dvt-hop', giaBan: 145_000 },
    ],
  },
];

describe('xayDungDsTemTuPhieuNhap', () => {
  it('lấy giá BÁN của đúng đơn vị đã chọn lúc nhập, số lượng tem mặc định = số lượng đã nhập', () => {
    expect(xayDungDsTemTuPhieuNhap(dongPhieuNhapMau)).toEqual([
      { id: 'd1', maHang: 'SP000125', ten: 'Betaloc 50mg', donViTen: 'hộp', giaBan: 145_000, soLuong: 2 },
    ]);
  });

  it('không tìm thấy đơn vị trong dsDonVi thì giá về 0 (không xảy ra ở luồng bình thường)', () => {
    const [ketQua] = xayDungDsTemTuPhieuNhap([{ ...dongPhieuNhapMau[0]!, donViTinhId: 'khong-ton-tai' }]);
    expect(ketQua?.giaBan).toBe(0);
  });
});

const dsTemMau: DongTemUI[] = [
  { id: 't1', maHang: 'SP000125', ten: 'Betaloc 50mg', donViTen: 'hộp', giaBan: 145_000, soLuong: 2 },
  { id: 't2', maHang: 'SP003948', ten: 'mãnh lực vương', donViTen: 'hộp', giaBan: 150_000, soLuong: 1 },
];

describe('suaSoLuongTem', () => {
  it('sửa đúng dòng, giữ nguyên dòng khác', () => {
    const ketQua = suaSoLuongTem(dsTemMau, 0, 5);
    expect(ketQua[0]?.soLuong).toBe(5);
    expect(ketQua[1]?.soLuong).toBe(1);
  });

  it('cho phép 0 (bỏ in dòng mà không cần xoá)', () => {
    expect(suaSoLuongTem(dsTemMau, 0, 0)[0]?.soLuong).toBe(0);
  });

  it('từ chối số âm hoặc không nguyên — giữ nguyên danh sách', () => {
    expect(suaSoLuongTem(dsTemMau, 0, -1)).toEqual(dsTemMau);
    expect(suaSoLuongTem(dsTemMau, 0, 1.5)).toEqual(dsTemMau);
  });
});

describe('xoaDongTem', () => {
  it('xoá đúng dòng theo chỉ số', () => {
    const ketQua = xoaDongTem(dsTemMau, 0);
    expect(ketQua).toHaveLength(1);
    expect(ketQua[0]?.id).toBe('t2');
  });
});

describe('tongSoLuongTem', () => {
  it('cộng tổng số lượng mọi dòng', () => {
    expect(tongSoLuongTem(dsTemMau)).toBe(3);
  });
});

describe('trieuKhaiDsTem', () => {
  it('lặp mỗi dòng đúng Số lượng lần, nội dung giống hệt trong cùng dòng', () => {
    const ketQua = trieuKhaiDsTem(dsTemMau);
    expect(ketQua).toHaveLength(3);
    expect(ketQua[0]?.maHang).toBe('SP000125');
    expect(ketQua[1]?.maHang).toBe('SP000125');
    expect(ketQua[2]?.maHang).toBe('SP003948');
  });

  it('dòng số lượng 0 không sinh tem nào', () => {
    const ketQua = trieuKhaiDsTem([{ ...dsTemMau[0]!, soLuong: 0 }]);
    expect(ketQua).toHaveLength(0);
  });
});

describe('boDauTiengViet', () => {
  it('xoá dấu tiếng Việt — máy in tem không in được chữ có dấu (BACKLOG.md T-042)', () => {
    expect(boDauTiengViet('Cồn đỏ bé')).toBe('Con do be');
    expect(boDauTiengViet('mãnh lực vương')).toBe('manh luc vuong');
    expect(boDauTiengViet('hộp')).toBe('hop');
    expect(boDauTiengViet('Đại Tràng HOÀN')).toBe('Dai Trang HOAN');
  });

  it('chữ không dấu giữ nguyên', () => {
    expect(boDauTiengViet('Betaloc 50mg')).toBe('Betaloc 50mg');
    expect(boDauTiengViet('SP000125')).toBe('SP000125');
  });
});

describe('InTemMa', () => {
  it('render bước danh sách: mã hàng, tên hàng, số lượng, tổng số tem', () => {
    const html = renderToStaticMarkup(<InTemMa dsTemBanDau={dsTemMau} onDong={() => {}} />);
    expect(html).toContain('In tem mã');
    expect(html).toContain('SP000125');
    expect(html).toContain('Betaloc 50mg');
    expect(html).toContain('Tổng số tem');
    expect(html).toContain('>3<'); // tổng 2 + 1
    expect(html).toContain('Bỏ qua');
  });
});
