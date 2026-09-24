import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DongGioHang } from './BanHang';
import {
  PanelThanhToan,
  kiemTraThanhToanHopLe,
  soNguyenKhongAmTuChuoi,
  soTienKhachThanhToanTuChuoi,
  tinhKhachCanTraXemTruoc,
  tinhTienThua,
  trangThaiThanhToanRong,
  xayDungYeuCauTaoHoaDon,
} from './ThanhToan';

describe('tinhKhachCanTraXemTruoc', () => {
  it('khách cần trả = tổng tiền hàng − giảm giá + thu khác (SPEC.md §3.4, làm tròn luôn 0 ở slice này)', () => {
    expect(tinhKhachCanTraXemTruoc(50_000, 5_000, 2_000)).toBe(47_000);
  });

  it('không giảm giá, không thu khác thì bằng đúng tổng tiền hàng', () => {
    expect(tinhKhachCanTraXemTruoc(260_000, 0, 0)).toBe(260_000);
  });
});

describe('tinhTienThua', () => {
  it('khách đưa nhiều hơn thì tiền thừa dương', () => {
    expect(tinhTienThua(100_000, 47_000)).toBe(53_000);
  });

  it('khách đưa vừa đủ thì tiền thừa bằng 0', () => {
    expect(tinhTienThua(47_000, 47_000)).toBe(0);
  });

  it('khách đưa thiếu thì tiền thừa âm', () => {
    expect(tinhTienThua(40_000, 47_000)).toBe(-7_000);
  });
});

describe('soNguyenKhongAmTuChuoi', () => {
  it('chuỗi rỗng coi là 0', () => {
    expect(soNguyenKhongAmTuChuoi('')).toBe(0);
  });

  it('chuỗi số nguyên hợp lệ', () => {
    expect(soNguyenKhongAmTuChuoi('5000')).toBe(5_000);
  });

  it('số âm không hợp lệ', () => {
    expect(soNguyenKhongAmTuChuoi('-5000')).toBeUndefined();
  });

  it('số thập phân không hợp lệ (SPEC.md §3.4: tiền là số nguyên)', () => {
    expect(soNguyenKhongAmTuChuoi('12.5')).toBeUndefined();
  });

  it('chuỗi không phải số không hợp lệ', () => {
    expect(soNguyenKhongAmTuChuoi('abc')).toBeUndefined();
  });
});

describe('soTienKhachThanhToanTuChuoi', () => {
  it('chuỗi rỗng nghĩa là khách đưa vừa đủ (mặc định của đa số lượt bán)', () => {
    expect(soTienKhachThanhToanTuChuoi('', 50_000)).toBe(50_000);
  });

  it('gõ số cụ thể thì dùng đúng số đó, không phải khách cần trả', () => {
    expect(soTienKhachThanhToanTuChuoi('100000', 47_000)).toBe(100_000);
  });

  it('số âm không hợp lệ', () => {
    expect(soTienKhachThanhToanTuChuoi('-1', 50_000)).toBeUndefined();
  });
});

describe('kiemTraThanhToanHopLe', () => {
  it('tiền mặt đưa đủ thì hợp lệ', () => {
    expect(
      kiemTraThanhToanHopLe({ phuongThucThanhToan: 'TIEN_MAT', khachThanhToan: 50_000, khachCanTra: 50_000 }),
    ).toBeUndefined();
  });

  it('tiền mặt đưa thiếu thì báo lỗi', () => {
    expect(
      kiemTraThanhToanHopLe({ phuongThucThanhToan: 'TIEN_MAT', khachThanhToan: 40_000, khachCanTra: 50_000 }),
    ).toBe('Khách thanh toán chưa đủ');
  });

  it('chuyển khoản không kiểm tra khách thanh toán', () => {
    expect(
      kiemTraThanhToanHopLe({ phuongThucThanhToan: 'CHUYEN_KHOAN', khachThanhToan: 0, khachCanTra: 50_000 }),
    ).toBeUndefined();
  });

  it('giảm giá vượt tổng tiền hàng (khách cần trả âm) bị chặn ở mọi phương thức', () => {
    expect(
      kiemTraThanhToanHopLe({ phuongThucThanhToan: 'CHUYEN_KHOAN', khachThanhToan: 0, khachCanTra: -1_000 }),
    ).toBe('Giảm giá vượt tổng tiền hàng');
  });
});

describe('xayDungYeuCauTaoHoaDon', () => {
  const gioHang: DongGioHang[] = [
    {
      sanPhamId: 'sp-1',
      maHang: 'SP001',
      ten: 'Panadol',
      donViTinhId: 'dvt-vi',
      donViTen: 'vỉ',
      heSo: 12,
      giaBan: 17_000,
      soLuong: 3,
      dsDonVi: [],
    },
  ];

  it('ánh xạ giỏ hàng và tuỳ chọn sang đúng hợp đồng TaoHoaDonReq', () => {
    const yeuCau = xayDungYeuCauTaoHoaDon(gioHang, {
      phuongThucThanhToan: 'TIEN_MAT',
      giamGia: 1_000,
      thuKhac: 0,
    });

    expect(yeuCau).toEqual({
      phuongThucThanhToan: 'TIEN_MAT',
      giamGia: 1_000,
      thuKhac: 0,
      dong: [{ sanPhamId: 'sp-1', donViTen: 'vỉ', heSo: 12, donGia: 17_000, soLuong: 3 }],
    });
  });
});

describe('PanelThanhToan', () => {
  const trangThaiCoBan = trangThaiThanhToanRong();

  it('hiện khách cần trả tính từ tổng tiền, giảm giá, thu khác', () => {
    const html = renderToStaticMarkup(
      <PanelThanhToan
        soMon={3}
        tongTien={260_000}
        trangThai={{ ...trangThaiCoBan, giamGia: '10000', thuKhac: '0' }}
        dangGui={false}
        loi={undefined}
        thongBao={undefined}
        gioHangRong={false}
        phuongThucRef={{ current: null }}
        onDoi={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain('Khách cần trả');
    expect(html).toContain('250,000');
  });

  it('mặc định tiền mặt thì hiện nút tiền nhanh và khách thanh toán/tiền thừa', () => {
    const html = renderToStaticMarkup(
      <PanelThanhToan
        soMon={1}
        tongTien={50_000}
        trangThai={trangThaiCoBan}
        dangGui={false}
        loi={undefined}
        thongBao={undefined}
        gioHangRong={false}
        phuongThucRef={{ current: null }}
        onDoi={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain('Khách thanh toán');
    expect(html).toContain('Tiền thừa trả khách');
  });

  it('chọn chuyển khoản thì ẩn nút tiền nhanh và khách thanh toán/tiền thừa', () => {
    const html = renderToStaticMarkup(
      <PanelThanhToan
        soMon={1}
        tongTien={50_000}
        trangThai={{ ...trangThaiCoBan, phuongThucThanhToan: 'CHUYEN_KHOAN' }}
        dangGui={false}
        loi={undefined}
        thongBao={undefined}
        gioHangRong={false}
        phuongThucRef={{ current: null }}
        onDoi={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(html).not.toContain('Khách thanh toán');
    expect(html).not.toContain('Tiền thừa trả khách');
  });

  it('giỏ hàng rỗng thì nút Thanh toán bị disabled', () => {
    const html = renderToStaticMarkup(
      <PanelThanhToan
        soMon={0}
        tongTien={0}
        trangThai={trangThaiCoBan}
        dangGui={false}
        loi={undefined}
        thongBao={undefined}
        gioHangRong={true}
        phuongThucRef={{ current: null }}
        onDoi={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  });

  it('hiện thông báo lỗi khi có', () => {
    const html = renderToStaticMarkup(
      <PanelThanhToan
        soMon={1}
        tongTien={50_000}
        trangThai={trangThaiCoBan}
        dangGui={false}
        loi="Khách thanh toán chưa đủ"
        thongBao={undefined}
        gioHangRong={false}
        phuongThucRef={{ current: null }}
        onDoi={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain('Khách thanh toán chưa đủ');
  });

  it('hiện thông báo thành công kèm mã hoá đơn khi có', () => {
    const html = renderToStaticMarkup(
      <PanelThanhToan
        soMon={1}
        tongTien={50_000}
        trangThai={trangThaiCoBan}
        dangGui={false}
        loi={undefined}
        thongBao="Đã tạo hoá đơn HD000005"
        gioHangRong={false}
        phuongThucRef={{ current: null }}
        onDoi={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain('Đã tạo hoá đơn HD000005');
  });

  it('phím tắt F9 hiện cạnh tiêu đề panel (UI-FIDELITY.md: mọi phím tắt phải hiện trên giao diện)', () => {
    const html = renderToStaticMarkup(
      <PanelThanhToan
        soMon={0}
        tongTien={0}
        trangThai={trangThaiCoBan}
        dangGui={false}
        loi={undefined}
        thongBao={undefined}
        gioHangRong={true}
        phuongThucRef={{ current: null }}
        onDoi={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(html).toContain('F9');
    expect(html).toContain('Thanh toán (Enter)');
  });
});
