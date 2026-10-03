import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TraHangDanhSachItem } from '../../../shared/hop-dong/tra-hang';
import { BangDanhSachTraHang } from './DanhSachTraHang';

const mucMau: TraHangDanhSachItem = {
  id: 'th-1',
  ma: 'TH000665',
  hoaDonId: 'hd-1',
  hoaDonMa: 'HD046758',
  chiNhanhId: 'cn-1',
  thoiGian: '2026-05-17T05:29:00.000Z',
  tongTienHoan: 32_000,
};

function ve(props: Partial<ComponentProps<typeof BangDanhSachTraHang>> = {}) {
  return renderToStaticMarkup(
    <BangDanhSachTraHang duLieu={[]} dangTai={false} loi={undefined} phieuChonId={undefined} onChonDong={() => {}} renderChiTiet={() => null} {...props} />,
  );
}

describe('BangDanhSachTraHang', () => {
  it('thứ tự cột khớp screenshot "Danh sách trả hàng": Mã trả hàng, Mã hoá đơn, Thời gian, Tổng tiền hoàn', () => {
    const html = ve();

    const viTri = ['Mã trả hàng', 'Mã hoá đơn', 'Thời gian', 'Tổng tiền hoàn'].map((c) => html.indexOf(c));
    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
  });

  it('hiện đúng dữ liệu một dòng: mã trả hàng, mã hoá đơn gốc, giờ Việt Nam, tiền có dấu phẩy', () => {
    const html = ve({ duLieu: [mucMau] });

    expect(html).toContain('TH000665');
    expect(html).toContain('HD046758');
    expect(html).toContain('17/05/2026 12:29');
    expect(html).toContain('32,000');
  });

  it('danh sách rỗng: hiện thông báo, không lỗi', () => {
    const html = ve();
    expect(html).toContain('Không có phiếu trả hàng nào');
  });

  it('đang tải: hiện "Đang tải…"', () => {
    const html = ve({ dangTai: true });
    expect(html).toContain('Đang tải…');
  });

  it('có lỗi: hiện thông báo lỗi', () => {
    const html = ve({ loi: 'Không tải được danh sách trả hàng' });
    expect(html).toContain('Không tải được danh sách trả hàng');
  });
});
