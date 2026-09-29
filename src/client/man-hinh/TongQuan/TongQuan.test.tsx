import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KhoiCanhBaoLechKho } from './TongQuan';

describe('KhoiCanhBaoLechKho', () => {
  it('không có cảnh báo: hiện thông báo rỗng, không hiện bảng', () => {
    const html = renderToStaticMarkup(<KhoiCanhBaoLechKho trangThai={{ canhBao: [], loi: undefined }} />);

    expect(html).toContain('Không có cảnh báo lệch kho.');
    expect(html).not.toContain('<table');
  });

  it('có cảnh báo: hiện đủ mã hàng, tên hàng, số lô/HSD, tồn âm trong bảng', () => {
    const html = renderToStaticMarkup(
      <KhoiCanhBaoLechKho
        trangThai={{
          canhBao: [
            {
              loId: 'lo-1',
              chiNhanhId: 'cn-1',
              sanPhamId: 'sp-1',
              maHang: 'SP001',
              tenSanPham: 'Paracetamol 500mg',
              soLo: 'L001',
              hsd: '2027-01-01',
              ton: -3,
            },
          ],
          loi: undefined,
        }}
      />,
    );

    expect(html).toContain('SP001');
    expect(html).toContain('Paracetamol 500mg');
    expect(html).toContain('L001');
    expect(html).toContain('2027-01-01');
    expect(html).toContain('-3');
    expect(html).not.toContain('Không có cảnh báo lệch kho.');
  });

  it('lô không có số lô/HSD (chế độ phẳng) hiện dấu gạch ngang, không hiện "null"', () => {
    const html = renderToStaticMarkup(
      <KhoiCanhBaoLechKho
        trangThai={{
          canhBao: [
            {
              loId: 'lo-2',
              chiNhanhId: 'cn-1',
              sanPhamId: 'sp-2',
              maHang: 'SP002',
              tenSanPham: 'Amoxicillin 500mg',
              soLo: null,
              hsd: null,
              ton: -1,
            },
          ],
          loi: undefined,
        }}
      />,
    );

    expect(html).not.toContain('null');
    expect(html.match(/<td>—<\/td>/g)?.length).toBe(2);
  });

  it('loi có giá trị: hiện thông báo lỗi, không hiện thông báo rỗng hay bảng', () => {
    const html = renderToStaticMarkup(
      <KhoiCanhBaoLechKho trangThai={{ canhBao: [], loi: 'Không tải được cảnh báo lệch kho' }} />,
    );

    expect(html).toContain('Không tải được cảnh báo lệch kho');
    expect(html).not.toContain('Không có cảnh báo lệch kho.');
  });
});
