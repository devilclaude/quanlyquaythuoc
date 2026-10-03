import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KhoiCanhBaoCanDate, KhoiCanhBaoLechKho } from './TongQuan';

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

describe('KhoiCanhBaoCanDate', () => {
  it('không có cảnh báo: hiện thông báo rỗng, không hiện bảng', () => {
    const html = renderToStaticMarkup(<KhoiCanhBaoCanDate trangThai={{ canhBao: [], loi: undefined }} />);

    expect(html).toContain('Không có lô nào sắp hết hạn trong 90 ngày tới.');
    expect(html).not.toContain('<table');
  });

  it('có cảnh báo: hiện đủ mã hàng, tên hàng, số lô/HSD, số ngày còn lại, tồn', () => {
    const html = renderToStaticMarkup(
      <KhoiCanhBaoCanDate
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
              soNgayConLai: 12,
              nguong: 30,
              ton: 5,
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
    expect(html).toContain('12');
    expect(html).toContain('5');
    expect(html).toContain('badge--nguy');
    expect(html).not.toContain('Không có lô nào sắp hết hạn trong 90 ngày tới.');
  });

  it('lô đã hết hạn (số ngày còn lại âm) hiện rõ đã quá hạn, không chỉ một số âm khó hiểu', () => {
    const html = renderToStaticMarkup(
      <KhoiCanhBaoCanDate
        trangThai={{
          canhBao: [
            {
              loId: 'lo-2',
              chiNhanhId: 'cn-1',
              sanPhamId: 'sp-2',
              maHang: 'SP002',
              tenSanPham: 'Amoxicillin 500mg',
              soLo: 'L002',
              hsd: '2026-09-01',
              soNgayConLai: -5,
              nguong: 30,
              ton: 2,
            },
          ],
          loi: undefined,
        }}
      />,
    );

    expect(html).toContain('Đã hết hạn');
  });

  it('ba mức ngưỡng ra ba màu badge khác nhau: 30 = nguy, 60 = cảnh báo, 90 = trung tính', () => {
    const dongMau = (nguong: 30 | 60 | 90, id: string) => ({
      loId: id,
      chiNhanhId: 'cn-1',
      sanPhamId: id,
      maHang: id,
      tenSanPham: id,
      soLo: 'L1',
      hsd: '2027-01-01',
      soNgayConLai: nguong,
      nguong,
      ton: 1,
    });
    const html = renderToStaticMarkup(
      <KhoiCanhBaoCanDate
        trangThai={{ canhBao: [dongMau(30, 'a'), dongMau(60, 'b'), dongMau(90, 'c')], loi: undefined }}
      />,
    );

    expect(html).toContain('badge--nguy');
    expect(html).toContain('badge--canh-bao');
    expect(html).toContain('badge--trung-tinh');
  });

  it('loi có giá trị: hiện thông báo lỗi, không hiện thông báo rỗng hay bảng', () => {
    const html = renderToStaticMarkup(
      <KhoiCanhBaoCanDate trangThai={{ canhBao: [], loi: 'Không tải được cảnh báo cận date' }} />,
    );

    expect(html).toContain('Không tải được cảnh báo cận date');
    expect(html).not.toContain('Không có lô nào sắp hết hạn trong 90 ngày tới.');
  });
});
