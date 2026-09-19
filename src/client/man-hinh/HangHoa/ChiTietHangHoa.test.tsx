import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { HangHoaChiTietRes } from '../../../shared/hop-dong/hang-hoa';
import { ChanHangHoa, ThongTinHangHoa } from './ChiTietHangHoa';

const chiTietNhieuDonVi: HangHoaChiTietRes = {
  id: 'sp-1',
  maHang: 'SP001',
  ten: 'Paracetamol 500mg',
  giaBan: 500,
  giaVon: 0,
  tonKho: 864,
  ngayTao: '2026-09-01T02:00:00.000Z',
  trangThai: 'HOAT_DONG',
  coTheXoaCung: true,
  donViTinh: [
    { id: 'dvt-vien', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 },
    { id: 'dvt-vi', ten: 'vỉ', heSo: 12, laCoSo: false, giaBan: 6000 },
    { id: 'dvt-hop', ten: 'hộp', heSo: 180, laCoSo: false, giaBan: 90000 },
  ],
};

const chiTietTonPhang: HangHoaChiTietRes = {
  id: 'sp-2',
  maHang: 'SP002',
  ten: 'Nước muối sinh lý 500ml',
  giaBan: 15000,
  giaVon: 0,
  tonKho: 50,
  ngayTao: '2026-09-01T02:00:00.000Z',
  trangThai: 'HOAT_DONG',
  coTheXoaCung: true,
  donViTinh: [{ id: 'dvt-chai', ten: 'chai', heSo: 1, laCoSo: true, giaBan: 15000 }],
};

describe('ThongTinHangHoa', () => {
  it('hiện tên, mã hàng, bảng đơn vị tính, giá vốn (tạm 0), và tồn kho chính+phụ (SPEC.md §3.3: 864 viên ≈ 4,8 hộp)', () => {
    const html = renderToStaticMarkup(<ThongTinHangHoa chiTiet={chiTietNhieuDonVi} />);

    expect(html).toContain('Paracetamol 500mg');
    expect(html).toContain('SP001');
    expect(html).toContain('vỉ');
    expect(html).toContain('hộp');
    expect(html).toContain('Giá vốn');
    expect(html).toContain('864');
    expect(html).toContain('≈ 4,8 hộp');
    // Khớp thứ tự trường trong ảnh "xem chi tiết 1 sản phẩm": Giá vốn đứng trước Giá bán.
    expect(html.indexOf('Giá vốn')).toBeLessThan(html.indexOf('Giá bán'));
  });

  it('sản phẩm chỉ có đơn vị cơ sở (tồn phẳng) thì không hiện dòng quy đổi phụ', () => {
    expect(renderToStaticMarkup(<ThongTinHangHoa chiTiet={chiTietTonPhang} />)).not.toContain('≈');
  });
});

describe('ChanHangHoa (T-009c) — vị trí khớp ảnh "xem chi tiết 1 sản phẩm"', () => {
  it('còn hoạt động và CHƯA phát sinh thẻ kho: nút trái là "Xóa", nút phải là "Chỉnh sửa"', () => {
    const html = renderToStaticMarkup(
      <ChanHangHoa
        trangThai="HOAT_DONG"
        coTheXoaCung={true}
        dangXuLy={false}
        onBamSua={() => {}}
        onBamXoaHoacNgungHoatDong={() => {}}
      />,
    );

    expect(html).toContain('Xóa');
    expect(html).toContain('Chỉnh sửa');
    expect(html.indexOf('Xóa')).toBeLessThan(html.indexOf('Chỉnh sửa'));
  });

  it('còn hoạt động nhưng ĐÃ phát sinh thẻ kho: nút trái đổi thành "Ngừng hoạt động"', () => {
    const html = renderToStaticMarkup(
      <ChanHangHoa
        trangThai="HOAT_DONG"
        coTheXoaCung={false}
        dangXuLy={false}
        onBamSua={() => {}}
        onBamXoaHoacNgungHoatDong={() => {}}
      />,
    );

    expect(html).toContain('Ngừng hoạt động');
    expect(html).not.toContain('>Xóa<');
  });

  it('đã ngừng hoạt động: không còn nút Xoá/Ngừng hoạt động, chỉ còn badge trạng thái', () => {
    const html = renderToStaticMarkup(
      <ChanHangHoa
        trangThai="NGUNG_HOAT_DONG"
        coTheXoaCung={false}
        dangXuLy={false}
        onBamSua={() => {}}
        onBamXoaHoacNgungHoatDong={() => {}}
      />,
    );

    expect(html).toContain('Đã ngừng hoạt động');
    expect(html).not.toContain('Ngừng hoạt động<');
    expect(html).toContain('Chỉnh sửa');
  });
});
