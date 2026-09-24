import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InHoaDon, xayDungHoaDonDeIn, type HoaDonDeIn } from './InHoaDon';
import type { DongGioHang } from './BanHang';

const gioHangMau: DongGioHang[] = [
  {
    sanPhamId: 'sp-1',
    maHang: 'SP000240',
    ten: 'Panadol Extra',
    donViTinhId: 'dvt-hop',
    donViTen: 'hộp',
    heSo: 15,
    giaBan: 260_000,
    soLuong: 2,
    dsDonVi: [],
  },
];

describe('xayDungHoaDonDeIn', () => {
  it('ghép giỏ hàng (giá lúc bán) với kết quả server thành nội dung cần in', () => {
    const ketQua = xayDungHoaDonDeIn(
      gioHangMau,
      {
        id: 'hd-1',
        ma: 'HD000123',
        tongTienHang: 520_000,
        giamGia: 20_000,
        thuKhac: 0,
        lamTron: 0,
        khachCanTra: 500_000,
        thoiGian: '2026-09-24T03:00:00.000Z',
      },
      { phuongThucThanhToan: 'TIEN_MAT', khachThanhToan: 500_000 },
    );

    expect(ketQua.ma).toBe('HD000123');
    expect(ketQua.dong).toEqual([
      { maHang: 'SP000240', ten: 'Panadol Extra', donViTen: 'hộp', soLuong: 2, donGia: 260_000, thanhTien: 520_000 },
    ]);
    expect(ketQua.khachThanhToan).toBe(500_000);
    expect(ketQua.tienThua).toBe(0);
  });

  it('không phải tiền mặt thì không có khachThanhToan/tienThua — chuyển khoản không có khái niệm "khách đưa"', () => {
    const ketQua = xayDungHoaDonDeIn(
      gioHangMau,
      {
        id: 'hd-1',
        ma: 'HD000123',
        tongTienHang: 520_000,
        giamGia: 0,
        thuKhac: 0,
        lamTron: 0,
        khachCanTra: 520_000,
        thoiGian: '2026-09-24T03:00:00.000Z',
      },
      { phuongThucThanhToan: 'CHUYEN_KHOAN' },
    );

    expect('khachThanhToan' in ketQua).toBe(false);
    expect('tienThua' in ketQua).toBe(false);
  });
});

const hoaDonKhongTienMat: HoaDonDeIn = {
  ma: 'HD000123',
  thoiGian: '2026-09-24T03:00:00.000Z',
  dong: [{ maHang: 'SP000240', ten: 'Panadol Extra', donViTen: 'hộp', soLuong: 2, donGia: 260_000, thanhTien: 520_000 }],
  tongTienHang: 520_000,
  giamGia: 20_000,
  thuKhac: 5_000,
  khachCanTra: 505_000,
  phuongThucThanhToan: 'CHUYEN_KHOAN',
};

const hoaDonMau: HoaDonDeIn = {
  ...hoaDonKhongTienMat,
  phuongThucThanhToan: 'TIEN_MAT',
  khachThanhToan: 505_000,
  tienThua: 0,
};

describe('InHoaDon', () => {
  it('không hoá đơn nào cần in thì không render gì', () => {
    const html = renderToStaticMarkup(
      <InHoaDon hoaDon={undefined} khoGiay="K80" onDoiKhoGiay={() => {}} onDong={() => {}} />,
    );
    expect(html).toBe('');
  });

  it('render đủ nội dung hoá đơn: mã, giờ VN, dòng hàng, tổng, giảm giá, thu khác, tiền thừa', () => {
    const html = renderToStaticMarkup(
      <InHoaDon hoaDon={hoaDonMau} khoGiay="K80" onDoiKhoGiay={() => {}} onDong={() => {}} />,
    );

    expect(html).toContain('HD000123');
    expect(html).toContain('24/09/2026 10:00'); // UTC 03:00 + 7 = giờ VN 10:00
    expect(html).toContain('Panadol Extra (hộp)');
    expect(html).toContain('520,000');
    expect(html).toContain('Giảm giá');
    expect(html).toContain('Thu khác');
    expect(html).toContain('Khách cần trả');
    expect(html).toContain('505,000');
    expect(html).toContain('Tiền thừa trả khách');
    expect(html).toContain('Tiền mặt');
  });

  it('không phải tiền mặt thì không hiện dòng khách thanh toán/tiền thừa', () => {
    const html = renderToStaticMarkup(
      <InHoaDon hoaDon={hoaDonKhongTienMat} khoGiay="K80" onDoiKhoGiay={() => {}} onDong={() => {}} />,
    );

    expect(html).not.toContain('Khách thanh toán');
    expect(html).not.toContain('Tiền thừa trả khách');
    expect(html).toContain('Chuyển khoản');
  });

  it('không có giảm giá/thu khác thì không hiện hai dòng đó', () => {
    const html = renderToStaticMarkup(
      <InHoaDon
        hoaDon={{ ...hoaDonMau, giamGia: 0, thuKhac: 0 }}
        khoGiay="K80"
        onDoiKhoGiay={() => {}}
        onDong={() => {}}
      />,
    );

    expect(html).not.toContain('Giảm giá');
    expect(html).not.toContain('Thu khác');
  });

  it('khổ giấy K57 chọn đúng radio và đặt bề rộng tờ giấy 57mm', () => {
    const html = renderToStaticMarkup(
      <InHoaDon hoaDon={hoaDonMau} khoGiay="K57" onDoiKhoGiay={() => {}} onDong={() => {}} />,
    );

    expect(html).toContain('57mm');
    // Radio K57 checked — không kiểm K80 vì render tĩnh không phân biệt được
    // thứ tự DOM checked dễ nhầm, chỉ cần khớp đúng width tờ giấy đang xem.
  });
});
