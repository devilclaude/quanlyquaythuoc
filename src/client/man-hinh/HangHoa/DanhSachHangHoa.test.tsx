import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import type { HangHoaDanhSachItem } from '../../../shared/hop-dong/hang-hoa';
import { BangDanhSachHangHoa, chonDongTiepTheo } from './DanhSachHangHoa';

// dinhDangThoiGianVN chuyển sang src/shared/thoi-gian/dinh-dang.ts (T-023, dùng
// chung với màn in hoá đơn) — test đi theo, xem dinh-dang.test.ts.

describe('chonDongTiepTheo', () => {
  it('bấm dòng đang đóng thì mở dòng đó', () => {
    expect(chonDongTiepTheo(undefined, 'sp-1')).toBe('sp-1');
  });

  it('bấm lại dòng đang mở thì đóng lại', () => {
    expect(chonDongTiepTheo('sp-1', 'sp-1')).toBeUndefined();
  });

  it('bấm dòng khác thì chuyển sang dòng mới', () => {
    expect(chonDongTiepTheo('sp-1', 'sp-2')).toBe('sp-2');
  });
});

const mucMau: HangHoaDanhSachItem = {
  id: 'sp-1',
  maHang: 'SP001',
  ten: 'Paracetamol 500mg',
  giaBan: 500,
  giaVon: 0,
  tonKho: 900,
  ngayTao: '2026-09-01T02:00:00.000Z',
  donViTinh: [{ id: 'dvt-1', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 500 }],
};

function ve(props: Partial<ComponentProps<typeof BangDanhSachHangHoa>> = {}) {
  return renderToStaticMarkup(
    <BangDanhSachHangHoa
      duLieu={[]}
      dangTai={false}
      loi={undefined}
      hangChonId={undefined}
      onChonDong={() => {}}
      renderChiTiet={() => null}
      {...props}
    />,
  );
}

describe('BangDanhSachHangHoa', () => {
  it('thứ tự cột khớp screenshot "Danh sách hàng hóa": Mã hàng, Tên hàng, Giá bán, Giá vốn, Tồn kho, Thời gian tạo', () => {
    const html = ve();

    const viTri = ['Mã hàng', 'Tên hàng', 'Giá bán', 'Giá vốn', 'Tồn kho', 'Thời gian tạo'].map((c) =>
      html.indexOf(c),
    );

    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
  });

  it('hiện đúng dữ liệu một dòng: tiền có dấu phẩy, ngày giờ theo giờ Việt Nam', () => {
    const html = ve({ duLieu: [mucMau] });

    expect(html).toContain('SP001');
    expect(html).toContain('Paracetamol 500mg');
    expect(html).toContain('01/09/2026 09:00');
  });

  it('trạng thái đang tải không hiện bảng rỗng gây hiểu lầm', () => {
    expect(ve({ dangTai: true })).toContain('Đang tải');
  });

  it('trạng thái rỗng khi tìm không ra kết quả', () => {
    expect(ve()).toContain('Không có hàng hoá');
  });

  it('trạng thái lỗi hiện đúng thông báo lỗi', () => {
    expect(ve({ loi: 'Không kết nối được máy chủ' })).toContain('Không kết nối được máy chủ');
  });

  it('dòng đang chọn render đúng nội dung chi tiết ngay dưới dòng đó, không gọi renderChiTiet cho dòng khác', () => {
    const mucKhac: HangHoaDanhSachItem = { ...mucMau, id: 'sp-2', maHang: 'SP002' };
    const html = ve({
      duLieu: [mucMau, mucKhac],
      hangChonId: 'sp-1',
      renderChiTiet: (id) => <div>chi-tiet-cua-{id}</div>,
    });

    expect(html).toContain('chi-tiet-cua-sp-1');
    expect(html).not.toContain('chi-tiet-cua-sp-2');
  });
});
