import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DongGioHang } from './BanHang';
import {
  PanelThanhToan,
  kiemTraThanhToanHopLe,
  soNguyenKhongAmTuChuoi,
  soTienKhachThanhToanTuChuoi,
  tinhKhachCanTraXemTruoc,
  tinhMenhGiaNhanh,
  tinhTienThua,
  trangThaiThanhToanRong,
  xayDungYeuCauTaoHoaDon,
} from './ThanhToan';

describe('tinhMenhGiaNhanh', () => {
  it('khớp đúng ảnh KiotViet "Chọn 1 món hàng để bán...": khách cần trả 17.000đ ra dãy 17.000/18.000/20.000/50.000/100.000/200.000/500.000', () => {
    expect(tinhMenhGiaNhanh(17_000)).toEqual([17_000, 18_000, 20_000, 50_000, 100_000, 200_000, 500_000]);
  });

  it('luôn tăng dần, không trùng lặp, kể cả khi việc làm tròn lên các mệnh giá không đơn điệu', () => {
    // 41.000: làm tròn lên 2k=42k, 5k=45k, 10k=50k, 20k=60k, 50k=50k (NHỎ HƠN
    // 60k của bước trước) — nếu chỉ so với phần tử cuối cùng thì dãy sẽ không
    // tăng dần đúng; phải gom rồi sắp lại toàn bộ.
    const ketQua = tinhMenhGiaNhanh(41_000);
    expect(ketQua).toEqual([...ketQua].sort((a, b) => a - b));
    expect(new Set(ketQua).size).toBe(ketQua.length);
    expect(ketQua[0]).toBe(41_000);
  });
});

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

  it('chọn chuyển khoản thì ẩn nút tiền nhanh và ô khách thanh toán, vẫn hiện tiền thừa trả khách', () => {
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
    // "Tiền thừa trả khách" luôn hiện (khớp ảnh "Giao diện bán hàng chưa có
    // sản phẩm" — dòng này có mặt kể cả khi giỏ rỗng), chỉ ô nhập/nút tiền
    // nhanh gắn riêng với Tiền mặt mới bị ẩn.
    expect(html).toContain('Tiền thừa trả khách');
  });

  it('nhóm phương thức thanh toán là radio LUÔN hiện đồng thời cả 4 lựa chọn, không phải dropdown (ảnh KiotViet)', () => {
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

    expect(html).not.toContain('<select');
    expect((html.match(/type="radio"/g) ?? []).length).toBe(4);
    expect(html).toContain('Tiền mặt');
    expect(html).toContain('Chuyển khoản');
    expect(html).toContain('Thẻ');
    expect(html).toContain('Ví');
  });

  it('giỏ hàng rỗng thì ẩn cả khu vực thanh toán (radio, khách thanh toán, mệnh giá nhanh) — khớp ảnh "Giao diện bán hàng chưa có sản phẩm"', () => {
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

    expect(html).not.toContain('type="radio"');
    expect(html).not.toContain('Khách thanh toán');
    expect(html).toContain('Khách cần trả');
    expect(html).toContain('Tiền thừa trả khách');
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
