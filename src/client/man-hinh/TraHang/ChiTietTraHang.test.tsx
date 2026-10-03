import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TraHangChiTietRes } from '../../../shared/hop-dong/tra-hang';
import { ThongTinTraHang } from './ChiTietTraHang';

const chiTietMau: TraHangChiTietRes = {
  id: 'th-1',
  ma: 'TH000001',
  hoaDonId: 'hd-1',
  hoaDonMa: 'HD046758',
  chiNhanhId: 'cn-1',
  thoiGian: '2026-05-17T05:29:00.000Z',
  tongTienHoan: 32_000,
  dong: [
    { id: 'thd-1', hoaDonDongId: 'hdd-1', sanPhamId: 'sp-1', maHang: 'SP004085', ten: 'Long huyết btg gold', soLuong: 1, tienHoan: 32_000 },
  ],
};

describe('ThongTinTraHang', () => {
  it('hiện mã phiếu trả, mã hoá đơn gốc (liên kết), và bảng dòng', () => {
    const html = renderToStaticMarkup(<ThongTinTraHang chiTiet={chiTietMau} />);

    expect(html).toContain('TH000001');
    expect(html).toContain('HD046758');
    expect(html).toContain('SP004085');
    const viTri = ['Mã hàng', 'Tên hàng', 'Số lượng', 'Tiền hoàn'].map((c) => html.indexOf(c));
    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
  });

  it('tổng tiền hoàn và số lượng mặt hàng ở chân bảng', () => {
    const html = renderToStaticMarkup(<ThongTinTraHang chiTiet={chiTietMau} />);

    expect(html).toContain('Tổng tiền hoàn');
    expect(html).toContain('32,000');
    expect(html).toContain('Số lượng mặt hàng');
  });

  it('mã hoá đơn gốc là một nút bấm được (mở lại hoá đơn, chưa bấm thì chưa gọi API)', () => {
    const html = renderToStaticMarkup(<ThongTinTraHang chiTiet={chiTietMau} />);

    expect(html).toContain('<button');
    expect(html).toContain('>HD046758<');
  });

  it('có badge trạng thái "Đã trả" cạnh mã phiếu — khớp ảnh gốc, trả hàng luôn hoàn tất ngay (T-052a: không có phiếu tạm)', () => {
    const html = renderToStaticMarkup(<ThongTinTraHang chiTiet={chiTietMau} />);

    expect(html).toContain('Đã trả');
    expect(html).toContain('badge--tot');
  });
});
