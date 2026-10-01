import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PhieuNhapDanhSachItem } from '../../../shared/hop-dong/phieu-nhap';
import { BangDanhSachPhieuNhap, xayDungTruyVanDanhSachPhieuNhap } from './DanhSachPhieuNhap';
import { nhanTrangThaiPhieuNhap } from './trang-thai-phieu-nhap';

describe('xayDungTruyVanDanhSachPhieuNhap', () => {
  it('không chọn tìm, chọn đủ cả hai trạng thái — bỏ qua tham số trangThai (không lọc gì)', () => {
    const qs = xayDungTruyVanDanhSachPhieuNhap({ tim: '', trangThaiDaChon: ['PHIEU_TAM', 'HOAN_THANH'] });
    expect(qs).not.toContain('trangThai=');
  });

  it('chỉ chọn một trạng thái — có đúng một tham số trangThai', () => {
    const qs = xayDungTruyVanDanhSachPhieuNhap({ tim: '', trangThaiDaChon: ['PHIEU_TAM'] });
    expect(qs).toContain('trangThai=PHIEU_TAM');
    expect(qs).not.toContain('trangThai=HOAN_THANH');
  });

  it('có từ khoá tìm — gửi kèm tham số tim, đã encode', () => {
    const qs = xayDungTruyVanDanhSachPhieuNhap({ tim: 'PN0022', trangThaiDaChon: ['PHIEU_TAM', 'HOAN_THANH'] });
    expect(qs).toContain('tim=PN0022');
  });
});

const mucMau: PhieuNhapDanhSachItem = {
  id: 'pn-1',
  ma: 'PN002221',
  chiNhanhId: 'cn-1',
  trangThai: 'HOAN_THANH',
  thoiGian: '2026-05-17T03:58:00.000Z',
  tongTien: 11_898_000,
};

function ve(props: Partial<ComponentProps<typeof BangDanhSachPhieuNhap>> = {}) {
  return renderToStaticMarkup(
    <BangDanhSachPhieuNhap
      duLieu={[]}
      dangTai={false}
      loi={undefined}
      phieuChonId={undefined}
      onChonDong={() => {}}
      renderChiTiet={() => null}
      {...props}
    />,
  );
}

describe('nhanTrangThaiPhieuNhap', () => {
  it('PHIEU_TAM hiện "Phiếu tạm"', () => {
    expect(nhanTrangThaiPhieuNhap('PHIEU_TAM')).toBe('Phiếu tạm');
  });

  it('HOAN_THANH hiện "Đã nhập hàng" — đúng từ ngữ KiotViet', () => {
    expect(nhanTrangThaiPhieuNhap('HOAN_THANH')).toBe('Đã nhập hàng');
  });
});

describe('BangDanhSachPhieuNhap', () => {
  it('thứ tự cột khớp screenshot "Danh sách nhập hàng": Mã nhập hàng, Thời gian, Tổng tiền, Trạng thái', () => {
    const html = ve();

    const viTri = ['Mã nhập hàng', 'Thời gian', 'Tổng tiền', 'Trạng thái'].map((c) => html.indexOf(c));

    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
  });

  it('hiện đúng dữ liệu một dòng: mã, giờ Việt Nam, tiền có dấu phẩy, nhãn trạng thái', () => {
    const html = ve({ duLieu: [mucMau] });

    expect(html).toContain('PN002221');
    expect(html).toContain('17/05/2026 10:58');
    expect(html).toContain('11,898,000');
    expect(html).toContain('Đã nhập hàng');
  });

  it('trạng thái đang tải không hiện bảng rỗng gây hiểu lầm', () => {
    expect(ve({ dangTai: true })).toContain('Đang tải');
  });

  it('trạng thái rỗng khi không có phiếu nào khớp bộ lọc', () => {
    expect(ve()).toContain('Không có phiếu nhập');
  });

  it('trạng thái lỗi hiện đúng thông báo lỗi', () => {
    expect(ve({ loi: 'Không kết nối được máy chủ' })).toContain('Không kết nối được máy chủ');
  });

  it('dòng tổng ngay dưới header cộng đúng tổng tiền các phiếu đang hiện, đứng trước dòng dữ liệu đầu tiên — khớp ảnh gốc', () => {
    const mucKhac: PhieuNhapDanhSachItem = { ...mucMau, id: 'pn-2', ma: 'PN002222', tongTien: 3_170_000 };
    const html = ve({ duLieu: [mucMau, mucKhac] });

    expect(html).toContain('15,068,000'); // 11.898.000 + 3.170.000
    expect(html.indexOf('15,068,000')).toBeLessThan(html.indexOf('PN002221'));
  });

  it('dòng đang chọn render đúng nội dung chi tiết ngay dưới dòng đó, không gọi renderChiTiet cho dòng khác', () => {
    const mucKhac: PhieuNhapDanhSachItem = { ...mucMau, id: 'pn-2', ma: 'PN002222' };
    const html = ve({
      duLieu: [mucMau, mucKhac],
      phieuChonId: 'pn-1',
      renderChiTiet: (id) => <div>chi-tiet-cua-{id}</div>,
    });

    expect(html).toContain('chi-tiet-cua-pn-1');
    expect(html).not.toContain('chi-tiet-cua-pn-2');
  });
});
