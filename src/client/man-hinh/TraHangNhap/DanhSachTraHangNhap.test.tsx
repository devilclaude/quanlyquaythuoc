import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TraHangNhapDanhSachItem } from '../../../shared/hop-dong/tra-hang-nhap';
import { BangDanhSachTraHangNhap } from './DanhSachTraHangNhap';

const mucMau: TraHangNhapDanhSachItem = {
  id: 'thn-1',
  ma: 'THN000085',
  phieuNhapId: 'pn-1',
  phieuNhapMa: 'PN002223',
  chiNhanhId: 'cn-1',
  thoiGian: '2026-05-18T11:41:00.000Z',
  tongTienHoan: 960_000,
};

function ve(props: Partial<ComponentProps<typeof BangDanhSachTraHangNhap>> = {}) {
  return renderToStaticMarkup(
    <BangDanhSachTraHangNhap duLieu={[]} dangTai={false} loi={undefined} phieuChonId={undefined} onChonDong={() => {}} renderChiTiet={() => null} {...props} />,
  );
}

describe('BangDanhSachTraHangNhap', () => {
  it('thứ tự cột khớp screenshot "Trả hàng nhập": Mã trả hàng nhập, Mã nhập hàng, Thời gian, Tổng tiền hoàn', () => {
    const html = ve();

    const viTri = ['Mã trả hàng nhập', 'Mã nhập hàng', 'Thời gian', 'Tổng tiền hoàn'].map((c) => html.indexOf(c));
    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
  });

  it('hiện đúng dữ liệu một dòng: mã trả hàng nhập, mã phiếu nhập gốc, giờ Việt Nam, tiền có dấu phẩy', () => {
    const html = ve({ duLieu: [mucMau] });

    expect(html).toContain('THN000085');
    expect(html).toContain('PN002223');
    expect(html).toContain('18/05/2026 18:41');
    expect(html).toContain('960,000');
  });

  it('danh sách rỗng: hiện thông báo, không lỗi', () => {
    const html = ve();
    expect(html).toContain('Không có phiếu trả hàng nhập nào');
  });

  it('đang tải: hiện "Đang tải…"', () => {
    const html = ve({ dangTai: true });
    expect(html).toContain('Đang tải…');
  });

  it('có lỗi: hiện thông báo lỗi', () => {
    const html = ve({ loi: 'Không tải được danh sách trả hàng nhập' });
    expect(html).toContain('Không tải được danh sách trả hàng nhập');
  });
});
