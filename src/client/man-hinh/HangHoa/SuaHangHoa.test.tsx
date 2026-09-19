import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { HangHoaChiTietRes } from '../../../shared/hop-dong/hang-hoa';
import { SuaHangHoa } from './SuaHangHoa';

const chiTiet: HangHoaChiTietRes = {
  id: 'sp-1',
  maHang: 'SP001',
  ten: 'Paracetamol 500mg',
  giaBan: 500,
  giaVon: 0,
  tonKho: 864,
  ngayTao: '2026-09-01T00:00:00.000Z',
  trangThai: 'HOAT_DONG',
  coTheXoaCung: true,
  donViTinh: [{ id: 'dvt-vien', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 }],
};

describe('SuaHangHoa (bố cục)', () => {
  it('mở form với dữ liệu điền sẵn từ chi tiết, tiêu đề "Sửa hàng hóa", mã hàng chỉ đọc', () => {
    const html = renderToStaticMarkup(
      <SuaHangHoa chiTiet={chiTiet} onHuy={() => {}} onSuaXong={() => {}} />,
    );

    expect(html).toContain('Sửa hàng hóa');
    expect(html).toContain('value="SP001"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('value="Paracetamol 500mg"');
    expect(html).toContain('value="viên"');
  });
});
