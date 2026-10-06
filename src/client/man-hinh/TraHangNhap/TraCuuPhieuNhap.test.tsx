import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PhieuNhapDeTraHangNhapRes } from '../../../shared/hop-dong/tra-hang-nhap';
import { BangDongPhieuNhapDeTraHangNhap } from './TraCuuPhieuNhap';

const dongMau: PhieuNhapDeTraHangNhapRes['dong'] = [
  {
    id: 'pnd-1',
    sanPhamId: 'sp-1',
    maHang: 'SP001',
    ten: 'Panadol Extra',
    donViTen: 'hộp',
    heSo: 15,
    soLuongDaNhap: 10,
    conLaiToiDa: 6,
  },
];

describe('BangDongPhieuNhapDeTraHangNhap', () => {
  it('hiện Mã hàng/Tên hàng (kèm đơn vị)/Đã nhập/Còn trả được, theo đúng thứ tự cột', () => {
    const html = renderToStaticMarkup(<BangDongPhieuNhapDeTraHangNhap dong={dongMau} />);

    const viTri = ['Mã hàng', 'Tên hàng', 'Đã nhập', 'Còn trả được'].map((c) => html.indexOf(c));
    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
    expect(html).toContain('SP001');
    expect(html).toContain('Panadol Extra (hộp)');
    expect(html).toContain('>10<');
    expect(html).toContain('>6<');
  });

  it('KHÔNG hiện cột "Số lượng trả" khi không truyền onSuaSoLuongTra (T-053c1, chỉ đọc)', () => {
    const html = renderToStaticMarkup(<BangDongPhieuNhapDeTraHangNhap dong={dongMau} />);
    expect(html).not.toContain('Số lượng trả');
  });

  it('THÊM cột "Số lượng trả" kèm ô nhập khi truyền onSuaSoLuongTra (T-053c2, luồng tạo)', () => {
    const html = renderToStaticMarkup(
      <BangDongPhieuNhapDeTraHangNhap dong={dongMau} soLuongTra={{ 'pnd-1': 2 }} onSuaSoLuongTra={() => {}} />,
    );
    expect(html).toContain('Số lượng trả');
    expect(html).toContain('value="2"');
    expect(html).toContain('max="6"');
  });
});
