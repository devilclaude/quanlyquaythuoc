import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PhieuNhapChiTietRes } from '../../../shared/hop-dong/phieu-nhap';
import { ThongTinPhieuNhap } from './ChiTietPhieuNhap';

const chiTietPhang: PhieuNhapChiTietRes = {
  id: 'pn-1',
  ma: 'PN002221',
  chiNhanhId: 'cn-1',
  trangThai: 'HOAN_THANH',
  thoiGian: '2026-05-17T03:58:00.000Z',
  tongTien: 568_000,
  dong: [
    {
      id: 'pnd-1',
      sanPhamId: 'sp-1',
      maHang: 'SP000125',
      ten: 'Betaloc 50mg',
      donViTen: 'hộp',
      heSo: 1,
      donGia: 142_000,
      soLuong: 2,
      soLo: null,
      hsd: null,
    },
    {
      id: 'pnd-2',
      sanPhamId: 'sp-2',
      maHang: '8935022710786',
      ten: 'Cefdina 125 MG',
      donViTen: 'lọ',
      heSo: 1,
      donGia: 75_000,
      soLuong: 4,
      soLo: null,
      hsd: null,
    },
  ],
};

const chiTietCoLo: PhieuNhapChiTietRes = {
  ...chiTietPhang,
  dong: [{ ...chiTietPhang.dong[0]!, soLo: 'L01', hsd: '2027-06-30' }],
};

describe('ThongTinPhieuNhap', () => {
  it('hiện mã phiếu, trạng thái, và bảng dòng khớp screenshot "Chi tiết một đơn nhập hàng": Mã hàng, Tên hàng, Số lượng, Đơn giá, Thành tiền', () => {
    const html = renderToStaticMarkup(<ThongTinPhieuNhap chiTiet={chiTietPhang} />);

    expect(html).toContain('PN002221');
    expect(html).toContain('Đã nhập hàng');
    const viTri = ['Mã hàng', 'Tên hàng', 'Số lượng', 'Đơn giá', 'Thành tiền'].map((c) => html.indexOf(c));
    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
    expect(html).toContain('SP000125');
    expect(html).toContain('284,000'); // 142.000 × 2
  });

  it('tên hàng kèm đơn vị tính của dòng nhập — khớp ảnh gốc "Betaloc 50mg (hộp)"', () => {
    const html = renderToStaticMarkup(<ThongTinPhieuNhap chiTiet={chiTietPhang} />);
    expect(html).toContain('Betaloc 50mg (hộp)');
    expect(html).toContain('Cefdina 125 MG (lọ)');
  });

  it('tổng tiền hàng và số lượng mặt hàng ở chân bảng', () => {
    const html = renderToStaticMarkup(<ThongTinPhieuNhap chiTiet={chiTietPhang} />);

    expect(html).toContain('Số lượng mặt hàng');
    expect(html).toContain('2'); // hai dòng
    expect(html).toContain('Tổng tiền hàng');
    expect(html).toContain('568,000');
  });

  it('không có dòng nào khai lô/HSD thì KHÔNG hiện cột Số lô/Hạn dùng', () => {
    const html = renderToStaticMarkup(<ThongTinPhieuNhap chiTiet={chiTietPhang} />);
    expect(html).not.toContain('Số lô');
    expect(html).not.toContain('Hạn dùng');
  });

  it('có ít nhất một dòng khai lô/HSD thì hiện cột Số lô/Hạn dùng', () => {
    const html = renderToStaticMarkup(<ThongTinPhieuNhap chiTiet={chiTietCoLo} />);
    expect(html).toContain('Số lô');
    expect(html).toContain('Hạn dùng');
    expect(html).toContain('L01');
    expect(html).toContain('2027-06-30');
  });
});
