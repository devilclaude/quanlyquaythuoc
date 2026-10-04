import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TraHangNhapChiTietRes } from '../../../shared/hop-dong/tra-hang-nhap';
import { ThongTinTraHangNhap } from './ChiTietTraHangNhap';

const chiTietMau: TraHangNhapChiTietRes = {
  id: 'thn-1',
  ma: 'THN000085',
  phieuNhapId: 'pn-1',
  phieuNhapMa: 'PN002223',
  chiNhanhId: 'cn-1',
  thoiGian: '2026-05-18T11:41:00.000Z',
  tongTienHoan: 960_000,
  dong: [{ id: 'thnd-1', phieuNhapDongId: 'pnd-1', sanPhamId: 'sp-1', maHang: 'SP004007', ten: 'mama dha plus nhất nguyên', soLuong: 10, tienHoan: 960_000 }],
};

describe('ThongTinTraHangNhap', () => {
  it('hiện mã phiếu trả hàng nhập, mã phiếu nhập gốc (liên kết), và bảng dòng', () => {
    const html = renderToStaticMarkup(<ThongTinTraHangNhap chiTiet={chiTietMau} />);

    expect(html).toContain('THN000085');
    expect(html).toContain('PN002223');
    expect(html).toContain('SP004007');
    const viTri = ['Mã hàng', 'Tên hàng', 'Số lượng', 'Tiền hoàn'].map((c) => html.indexOf(c));
    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
  });

  it('tổng tiền hoàn và số lượng mặt hàng ở chân bảng', () => {
    const html = renderToStaticMarkup(<ThongTinTraHangNhap chiTiet={chiTietMau} />);

    expect(html).toContain('Tổng tiền hoàn');
    expect(html).toContain('960,000');
    expect(html).toContain('Số lượng mặt hàng');
  });

  it('có badge trạng thái "Đã trả hàng" cạnh mã phiếu — trả hàng nhập luôn hoàn tất ngay (T-053a: không có phiếu tạm)', () => {
    const html = renderToStaticMarkup(<ThongTinTraHangNhap chiTiet={chiTietMau} />);

    expect(html).toContain('Đã trả hàng');
    expect(html).toContain('badge--tot');
  });

  it('KHÔNG hiện mã phiếu nhập như nút bấm khi không truyền renderPhieuNhapGoc', () => {
    const html = renderToStaticMarkup(<ThongTinTraHangNhap chiTiet={chiTietMau} />);

    expect(html).not.toContain('<button');
    expect(html).toContain('PN002223');
  });

  it('mã phiếu nhập là nút bấm được và mở inline nội dung của renderPhieuNhapGoc khi truyền', () => {
    const html = renderToStaticMarkup(
      <ThongTinTraHangNhap chiTiet={chiTietMau} renderPhieuNhapGoc={(id) => <div data-testid="phieu-nhap-goc">phiếu nhập {id}</div>} />,
    );

    expect(html).toContain('<button');
    expect(html).toContain('>PN002223<');
  });
});
