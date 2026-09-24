import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HangHoaDanhSachItem } from '../../../shared/hop-dong/hang-hoa';
import {
  BangGioHang,
  DanhSachGoiY,
  ThanhTabHoaDon,
  capNhatEsc,
  capNhatNhipGo,
  capNhatTab,
  diChuyenChiSoGoiY,
  dinhDangTonTheoDonVi,
  doiDonViDongGioHang,
  doiDonViKeTiep,
  dongTab,
  layGoiYTimHang,
  moTabMoi,
  phanLoaiNhipGo,
  quyetDinhSauKhiQuet,
  soLuongCoSoDongGioHang,
  soThuTuTabTiepTheo,
  suaSoLuongDongGioHang,
  tabTheoViTri,
  taoTabRong,
  themVaoGioHang,
  tinhSoMon,
  tinhTongTien,
  xoaDongGioHang,
  type DongGioHang,
  type GoiYBanHang,
  type HoaDonTab,
} from './BanHang';

const panadol: HangHoaDanhSachItem = {
  id: 'sp-1',
  maHang: 'SP000240',
  ten: 'Panadol Extra hộp 15 vỉ x 12 viên nén GSK',
  giaBan: 17000,
  giaVon: 0,
  tonKho: 41,
  ngayTao: '2026-09-01T00:00:00.000Z',
  donViTinh: [
    { id: 'dvt-vi', ten: 'vỉ', heSo: 1, laCoSo: true, giaBan: 17000 },
    { id: 'dvt-hop', ten: 'hộp', heSo: 15, laCoSo: false, giaBan: 260000 },
  ],
};

const vitaminC: HangHoaDanhSachItem = {
  id: 'sp-2',
  maHang: 'SP002',
  ten: 'Vitamin C',
  giaBan: 1000,
  giaVon: 0,
  tonKho: 100,
  ngayTao: '2026-09-02T00:00:00.000Z',
  donViTinh: [{ id: 'dvt-vitaminc', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 1000 }],
};

describe('layGoiYTimHang', () => {
  it('trả về mảng rỗng khi không có hàng hoá nào khớp', () => {
    expect(layGoiYTimHang([])).toEqual([]);
  });

  it('mỗi đơn vị tính của một sản phẩm là một dòng gợi ý riêng, mang theo cả danh sách đơn vị của sản phẩm', () => {
    const ketQua = layGoiYTimHang([panadol]);

    expect(ketQua).toEqual([
      {
        sanPhamId: 'sp-1',
        maHang: 'SP000240',
        ten: 'Panadol Extra hộp 15 vỉ x 12 viên nén GSK',
        donViTinhId: 'dvt-vi',
        donViTen: 'vỉ',
        heSo: 1,
        giaBan: 17000,
        tonKhoCoSo: 41,
        dsDonVi: panadol.donViTinh,
      },
      {
        sanPhamId: 'sp-1',
        maHang: 'SP000240',
        ten: 'Panadol Extra hộp 15 vỉ x 12 viên nén GSK',
        donViTinhId: 'dvt-hop',
        donViTen: 'hộp',
        heSo: 15,
        giaBan: 260000,
        tonKhoCoSo: 41,
        dsDonVi: panadol.donViTinh,
      },
    ]);
  });

  it('giới hạn tối đa 12 dòng gợi ý dù có nhiều sản phẩm/đơn vị hơn', () => {
    const nhieuSanPham: HangHoaDanhSachItem[] = Array.from({ length: 8 }, (_v, i) => ({
      ...vitaminC,
      id: `sp-${i}`,
      maHang: `SP${i}`,
      donViTinh: [
        { id: `dvt-${i}-a`, ten: 'viên', heSo: 1, laCoSo: true, giaBan: 1000 },
        { id: `dvt-${i}-b`, ten: 'vỉ', heSo: 10, laCoSo: false, giaBan: 9000 },
      ],
    }));

    expect(layGoiYTimHang(nhieuSanPham)).toHaveLength(12);
  });
});

describe('diChuyenChiSoGoiY', () => {
  it('ArrowDown ở dòng cuối quay về dòng đầu', () => {
    expect(diChuyenChiSoGoiY(2, 3, 'ArrowDown')).toBe(0);
  });

  it('ArrowDown giữa danh sách thì sang dòng kế tiếp', () => {
    expect(diChuyenChiSoGoiY(0, 3, 'ArrowDown')).toBe(1);
  });

  it('ArrowUp ở dòng đầu quay về dòng cuối', () => {
    expect(diChuyenChiSoGoiY(0, 3, 'ArrowUp')).toBe(2);
  });

  it('ArrowUp giữa danh sách thì lùi về dòng trước', () => {
    expect(diChuyenChiSoGoiY(2, 3, 'ArrowUp')).toBe(1);
  });
});

const goiYVi: GoiYBanHang = {
  sanPhamId: 'sp-1',
  maHang: 'SP000240',
  ten: 'Panadol Extra',
  donViTinhId: 'dvt-vi',
  donViTen: 'vỉ',
  heSo: 1,
  giaBan: 17000,
  tonKhoCoSo: 41,
  dsDonVi: panadol.donViTinh,
};

const goiYHop: GoiYBanHang = { ...goiYVi, donViTinhId: 'dvt-hop', donViTen: 'hộp', heSo: 15, giaBan: 260000 };

describe('themVaoGioHang', () => {
  it('thêm dòng mới với số lượng 1 khi giỏ đang rỗng, mang theo hệ số và danh sách đơn vị', () => {
    expect(themVaoGioHang([], goiYVi)).toEqual([
      {
        sanPhamId: 'sp-1',
        maHang: 'SP000240',
        ten: 'Panadol Extra',
        donViTinhId: 'dvt-vi',
        donViTen: 'vỉ',
        heSo: 1,
        giaBan: 17000,
        soLuong: 1,
        dsDonVi: panadol.donViTinh,
      },
    ]);
  });

  it('thêm lại đúng sản phẩm + đúng đơn vị thì tăng số lượng dòng đã có, không tạo dòng mới', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    const ketQua = themVaoGioHang(gioHang, goiYVi);

    expect(ketQua).toHaveLength(1);
    expect(ketQua[0]?.soLuong).toBe(2);
  });

  it('cùng sản phẩm nhưng khác đơn vị tính là hai dòng riêng biệt', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    const ketQua = themVaoGioHang(gioHang, goiYHop);

    expect(ketQua).toHaveLength(2);
    expect(ketQua.map((d) => d.donViTinhId)).toEqual(['dvt-vi', 'dvt-hop']);
  });

  it('không sửa mảng giỏ hàng gốc (bất biến)', () => {
    const gioHangGoc: DongGioHang[] = [];
    themVaoGioHang(gioHangGoc, goiYVi);
    expect(gioHangGoc).toEqual([]);
  });
});

describe('doiDonViDongGioHang', () => {
  it('đổi đơn vị của đúng dòng: giá lấy trực tiếp từ đơn vị mới, không nhân hệ số', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    const ketQua = doiDonViDongGioHang(gioHang, 0, 'dvt-hop');

    expect(ketQua[0]).toMatchObject({ donViTinhId: 'dvt-hop', donViTen: 'hộp', heSo: 15, giaBan: 260000 });
  });

  it('không đổi số lượng khi đổi đơn vị', () => {
    let gioHang = themVaoGioHang([], goiYVi);
    gioHang = themVaoGioHang(gioHang, goiYVi);

    const ketQua = doiDonViDongGioHang(gioHang, 0, 'dvt-hop');

    expect(ketQua[0]?.soLuong).toBe(2);
  });

  it('chỉ đổi đúng dòng chỉ định, các dòng khác giữ nguyên', () => {
    let gioHang = themVaoGioHang([], goiYVi);
    gioHang = themVaoGioHang(gioHang, { ...goiYVi, sanPhamId: 'sp-2', maHang: 'SP002', dsDonVi: vitaminC.donViTinh, donViTinhId: 'dvt-vitaminc', donViTen: 'viên' });

    const ketQua = doiDonViDongGioHang(gioHang, 0, 'dvt-hop');

    expect(ketQua[1]?.donViTinhId).toBe('dvt-vitaminc');
  });

  it('id đơn vị không có trong danh sách đơn vị của dòng thì không đổi gì', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    const ketQua = doiDonViDongGioHang(gioHang, 0, 'khong-ton-tai');

    expect(ketQua).toEqual(gioHang);
  });

  it('không sửa mảng gốc (bất biến)', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    const banSao = gioHang.map((d) => ({ ...d }));

    doiDonViDongGioHang(gioHang, 0, 'dvt-hop');

    expect(gioHang).toEqual(banSao);
  });
});

describe('doiDonViKeTiep', () => {
  it('phím F2: chuyển sang đơn vị kế tiếp trong danh sách đơn vị của sản phẩm', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    const ketQua = doiDonViKeTiep(gioHang, 0);

    expect(ketQua[0]?.donViTinhId).toBe('dvt-hop');
  });

  it('ở đơn vị cuối thì quay vòng về đơn vị đầu', () => {
    const gioHang = themVaoGioHang([], goiYHop);
    const ketQua = doiDonViKeTiep(gioHang, 0);

    expect(ketQua[0]?.donViTinhId).toBe('dvt-vi');
  });

  it('sản phẩm chỉ có một đơn vị thì không đổi gì', () => {
    const goiYVitaminC: GoiYBanHang = {
      sanPhamId: 'sp-2',
      maHang: 'SP002',
      ten: 'Vitamin C',
      donViTinhId: 'dvt-vitaminc',
      donViTen: 'viên',
      heSo: 1,
      giaBan: 1000,
      tonKhoCoSo: 100,
      dsDonVi: vitaminC.donViTinh,
    };
    const gioHang = themVaoGioHang([], goiYVitaminC);

    const ketQua = doiDonViKeTiep(gioHang, 0);

    expect(ketQua).toEqual(gioHang);
  });
});

describe('suaSoLuongDongGioHang', () => {
  it('sửa đúng số lượng dòng chỉ định', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    const ketQua = suaSoLuongDongGioHang(gioHang, 0, 5);

    expect(ketQua[0]?.soLuong).toBe(5);
  });

  it('số lượng nhỏ hơn 1 bị từ chối, giữ nguyên giá trị cũ', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    const ketQua = suaSoLuongDongGioHang(gioHang, 0, 0);

    expect(ketQua[0]?.soLuong).toBe(1);
  });

  it('số không nguyên bị từ chối', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    const ketQua = suaSoLuongDongGioHang(gioHang, 0, 1.5);

    expect(ketQua[0]?.soLuong).toBe(1);
  });

  it('không sửa dòng khác ngoài chỉ số chỉ định', () => {
    let gioHang = themVaoGioHang([], goiYVi);
    gioHang = themVaoGioHang(gioHang, goiYHop);

    const ketQua = suaSoLuongDongGioHang(gioHang, 1, 9);

    expect(ketQua[0]?.soLuong).toBe(1);
    expect(ketQua[1]?.soLuong).toBe(9);
  });
});

describe('xoaDongGioHang', () => {
  it('xoá đúng dòng theo chỉ số, giữ nguyên các dòng khác', () => {
    let gioHang = themVaoGioHang([], goiYVi);
    gioHang = themVaoGioHang(gioHang, goiYHop);

    const ketQua = xoaDongGioHang(gioHang, 0);

    expect(ketQua).toHaveLength(1);
    expect(ketQua[0]?.donViTinhId).toBe('dvt-hop');
  });

  it('xoá dòng duy nhất thì giỏ hàng về rỗng', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    expect(xoaDongGioHang(gioHang, 0)).toEqual([]);
  });
});

describe('soLuongCoSoDongGioHang', () => {
  it('số lượng ở đơn vị cơ sở = số lượng × hệ số đơn vị đang chọn', () => {
    expect(soLuongCoSoDongGioHang({ soLuong: 3, heSo: 15 })).toBe(45);
  });

  it('đơn vị cơ sở (hệ số 1) thì số lượng cơ sở bằng chính số lượng', () => {
    expect(soLuongCoSoDongGioHang({ soLuong: 7, heSo: 1 })).toBe(7);
  });

  it('đổi đơn vị rồi mới tính thì dùng đúng hệ số MỚI, không phải hệ số lúc thêm vào giỏ', () => {
    const gioHang = themVaoGioHang([], goiYVi);
    const sauKhiDoi = doiDonViDongGioHang(gioHang, 0, 'dvt-hop');
    const dong = sauKhiDoi[0];

    expect(dong).toBeDefined();
    expect(soLuongCoSoDongGioHang(dong!)).toBe(15);
  });
});

describe('tinhTongTien', () => {
  it('bằng 0 khi giỏ rỗng', () => {
    expect(tinhTongTien([])).toBe(0);
  });

  it('cộng đúng giá × số lượng qua nhiều dòng, không lệch đồng nào', () => {
    const gioHang: DongGioHang[] = [
      { sanPhamId: 'sp-1', maHang: 'SP1', ten: 'A', donViTinhId: 'd1', donViTen: 'vỉ', heSo: 1, giaBan: 17000, soLuong: 2, dsDonVi: panadol.donViTinh },
      { sanPhamId: 'sp-2', maHang: 'SP2', ten: 'B', donViTinhId: 'd2', donViTen: 'hộp', heSo: 15, giaBan: 260000, soLuong: 1, dsDonVi: panadol.donViTinh },
    ];
    expect(tinhTongTien(gioHang)).toBe(17000 * 2 + 260000);
  });
});

describe('tinhSoMon', () => {
  it('bằng 0 khi giỏ rỗng — khớp ảnh "Giao diện bán hàng chưa có sản phẩm" (dòng Tổng tiền hàng hiện "0  0")', () => {
    expect(tinhSoMon([])).toBe(0);
  });

  it('cộng dồn số lượng mọi dòng, không phải đếm số dòng', () => {
    const gioHang: DongGioHang[] = [
      { sanPhamId: 'sp-1', maHang: 'SP1', ten: 'A', donViTinhId: 'd1', donViTen: 'vỉ', heSo: 1, giaBan: 17000, soLuong: 2, dsDonVi: panadol.donViTinh },
      { sanPhamId: 'sp-2', maHang: 'SP2', ten: 'B', donViTinhId: 'd2', donViTen: 'hộp', heSo: 15, giaBan: 260000, soLuong: 1, dsDonVi: panadol.donViTinh },
    ];
    expect(tinhSoMon(gioHang)).toBe(3);
  });
});

describe('dinhDangTonTheoDonVi', () => {
  it('đơn vị cơ sở (hệ số 1) hiện số nguyên, không có phần thập phân', () => {
    expect(dinhDangTonTheoDonVi(41, 1)).toBe('41');
  });

  it('quy đổi ra đơn vị lớn hiện tối đa 3 chữ số thập phân, khớp cách KiotViet hiện ("Tìm sản phẩm để bán")', () => {
    expect(dinhDangTonTheoDonVi(41, 15)).toBe('2.733');
  });

  it('tồn 0 hiện đúng "0", không phải chuỗi rỗng', () => {
    expect(dinhDangTonTheoDonVi(0, 1)).toBe('0');
  });
});

describe('capNhatNhipGo', () => {
  it('phím đầu tiên (chưa có lần trước) khởi tạo khoảng cách rỗng', () => {
    const ketQua = capNhatNhipGo({ lanTruocMs: null, khoangCach: [] }, 1000);
    expect(ketQua).toEqual({ lanTruocMs: 1000, khoangCach: [] });
  });

  it('phím kế tiếp trong nhịp cộng dồn đúng khoảng cách', () => {
    const b1 = capNhatNhipGo({ lanTruocMs: null, khoangCach: [] }, 1000);
    const b2 = capNhatNhipGo(b1, 1005);
    const b3 = capNhatNhipGo(b2, 1012);
    expect(b3).toEqual({ lanTruocMs: 1012, khoangCach: [5, 7] });
  });

  it('tạm dừng quá 1000ms thì reset khoảng cách — bắt đầu nhịp mới', () => {
    const b1 = capNhatNhipGo({ lanTruocMs: null, khoangCach: [] }, 1000);
    const b2 = capNhatNhipGo(b1, 1005);
    const b3 = capNhatNhipGo(b2, 3000); // cách b2 gần 2s — người dùng dừng gõ giữa chừng
    expect(b3).toEqual({ lanTruocMs: 3000, khoangCach: [] });
  });

  it('không sửa trạng thái gốc (bất biến)', () => {
    const goc = { lanTruocMs: 1000, khoangCach: [5] };
    capNhatNhipGo(goc, 1010);
    expect(goc).toEqual({ lanTruocMs: 1000, khoangCach: [5] });
  });
});

describe('phanLoaiNhipGo', () => {
  it('khoảng cách rất nhỏ và đủ dài (giống máy quét) → "quet"', () => {
    expect(phanLoaiNhipGo([4, 5, 3, 6, 4, 5])).toBe('quet');
  });

  it('khoảng cách lớn kiểu người gõ tay → "go-tay"', () => {
    expect(phanLoaiNhipGo([120, 150, 100, 130, 140, 110])).toBe('go-tay');
  });

  it('quá ít khoảng cách dù rất nhanh vẫn coi là gõ tay — tránh nhận nhầm từ khoá ngắn', () => {
    expect(phanLoaiNhipGo([2, 3, 2])).toBe('go-tay');
  });

  it('mảng rỗng (chưa gõ ký tự nào có nhịp) → "go-tay"', () => {
    expect(phanLoaiNhipGo([])).toBe('go-tay');
  });

  it('trung bình đúng bằng ngưỡng vẫn tính là "quet" (ngưỡng bao gồm)', () => {
    expect(phanLoaiNhipGo([50, 50, 50, 50, 50])).toBe('quet');
  });
});

describe('quyetDinhSauKhiQuet', () => {
  it('không có gợi ý nào → "khong-tim-thay"', () => {
    expect(quyetDinhSauKhiQuet([])).toEqual({ hanhDong: 'khong-tim-thay' });
  });

  it('đúng một sản phẩm, một đơn vị → thêm thẳng vào giỏ', () => {
    expect(quyetDinhSauKhiQuet([goiYVi])).toEqual({ hanhDong: 'them-vao-gio', goiYChon: goiYVi });
  });

  it('đúng một sản phẩm nhiều đơn vị (vd. quét trúng mã hàng có cả vỉ/hộp) → thêm dòng ĐẦU TIÊN (đơn vị cơ sở)', () => {
    expect(quyetDinhSauKhiQuet([goiYVi, goiYHop])).toEqual({ hanhDong: 'them-vao-gio', goiYChon: goiYVi });
  });

  it('nhiều sản phẩm khác nhau cùng khớp (mã chỉ khớp một phần) → hiện gợi ý, không tự đoán', () => {
    const goiYKhacSanPham: GoiYBanHang = { ...goiYVi, sanPhamId: 'sp-2', maHang: 'SP002' };
    expect(quyetDinhSauKhiQuet([goiYVi, goiYKhacSanPham])).toEqual({ hanhDong: 'hien-goi-y' });
  });
});

describe('capNhatEsc', () => {
  it('Esc lần đầu khi gợi ý đang mở: chỉ đóng gợi ý, giữ nguyên ô tìm', () => {
    expect(capNhatEsc(true)).toEqual({ dongGoiY: true, xoaOTim: false });
  });

  it('Esc lần hai khi gợi ý đã đóng: xoá ô tìm', () => {
    expect(capNhatEsc(false)).toEqual({ dongGoiY: false, xoaOTim: true });
  });
});

function veDanhSachGoiY(props: Partial<ComponentProps<typeof DanhSachGoiY>> = {}) {
  return renderToStaticMarkup(
    <DanhSachGoiY tuKhoa="" goiY={[]} dangTai={false} loi={undefined} chiSoChon={0} onChon={() => {}} {...props} />,
  );
}

describe('DanhSachGoiY', () => {
  it('không hiện gì khi ô tìm đang rỗng', () => {
    expect(veDanhSachGoiY({ tuKhoa: '' })).toBe('');
  });

  it('hiện "Đang tìm" khi đang chờ kết quả', () => {
    expect(veDanhSachGoiY({ tuKhoa: 'pana', dangTai: true })).toContain('Đang tìm');
  });

  it('hiện thông báo lỗi khi tìm thất bại', () => {
    expect(veDanhSachGoiY({ tuKhoa: 'pana', loi: 'Không tìm được hàng hoá' })).toContain(
      'Không tìm được hàng hoá',
    );
  });

  it('hiện "không tìm thấy" khi có từ khoá nhưng không có gợi ý', () => {
    expect(veDanhSachGoiY({ tuKhoa: 'zzz', goiY: [] })).toContain('Không tìm thấy');
  });

  it('mỗi dòng hiện tên, badge đơn vị, giá có dấu phẩy, mã hàng và tồn quy đổi đúng đơn vị', () => {
    const html = veDanhSachGoiY({ tuKhoa: 'pana', goiY: [goiYHop] });

    expect(html).toContain('Panadol Extra');
    expect(html).toContain('hộp');
    expect(html).toContain('260,000');
    expect(html).toContain('SP000240');
    expect(html).toContain(dinhDangTonTheoDonVi(41, 15));
  });

  it('dòng đang chọn theo bàn phím có class đánh dấu để CSS tô nền', () => {
    const html = veDanhSachGoiY({ tuKhoa: 'pana', goiY: [goiYVi, goiYHop], chiSoChon: 1 });
    const viTriDongThuHai = html.indexOf('hộp');
    const viTriLopChon = html.indexOf('goi-y__dong--chon');

    expect(viTriLopChon).toBeGreaterThanOrEqual(0);
    expect(viTriLopChon).toBeLessThan(viTriDongThuHai);
  });
});

const dongVi: DongGioHang = {
  sanPhamId: 'sp-1',
  maHang: 'SP000240',
  ten: 'Panadol Extra',
  donViTinhId: 'dvt-vi',
  donViTen: 'vỉ',
  heSo: 1,
  giaBan: 17000,
  soLuong: 2,
  dsDonVi: panadol.donViTinh,
};

function veBangGioHang(props: Partial<ComponentProps<typeof BangGioHang>> = {}) {
  return renderToStaticMarkup(
    <BangGioHang
      gioHang={[]}
      chiSoDongChon={-1}
      onChonDong={() => {}}
      onDoiDonVi={() => {}}
      onSuaSoLuong={() => {}}
      onXoaDong={() => {}}
      {...props}
    />,
  );
}

describe('BangGioHang', () => {
  it('trạng thái rỗng hướng dẫn bấm F3 để tìm hàng', () => {
    expect(veBangGioHang()).toContain('F3');
  });

  it('thứ tự cột: STT, Mã hàng, Tên hàng, Đơn vị, Số lượng, Đơn giá, Thành tiền — khớp hàng đã thêm trong ảnh KiotViet', () => {
    const html = veBangGioHang({ gioHang: [dongVi] });
    const viTri = ['STT', 'Mã hàng', 'Tên hàng', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Thành tiền'].map((c) =>
      html.indexOf(c),
    );

    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
  });

  it('thành tiền từng dòng bằng đơn giá × số lượng, có dấu phẩy ngăn cách hàng nghìn', () => {
    const html = veBangGioHang({ gioHang: [dongVi] });
    expect(html).toContain('34,000');
  });

  it('đơn vị hiện dưới dạng select liệt kê mọi đơn vị của sản phẩm, chọn sẵn đơn vị hiện tại của dòng', () => {
    const html = veBangGioHang({ gioHang: [dongVi] });

    expect(html).toContain('<select');
    expect(html).toContain('value="dvt-vi" selected');
    expect(html).toContain('>vỉ<');
    expect(html).toContain('>hộp<');
  });

  it('số lượng hiện trong ô nhập số, sửa được bằng bàn phím', () => {
    const html = veBangGioHang({ gioHang: [dongVi] });

    expect(html).toContain('type="number"');
    expect(html).toContain('value="2"');
  });

  it('có nút xoá dòng riêng biệt (khớp icon thùng rác trong ảnh KiotViet)', () => {
    const html = veBangGioHang({ gioHang: [dongVi] });
    expect(html).toContain('gio-hang__nut-xoa');
  });

  it('dòng đang chọn (phím F2/+/-/Delete tác động vào) có class đánh dấu', () => {
    const html = veBangGioHang({ gioHang: [dongVi], chiSoDongChon: 0 });
    expect(html).toContain('gio-hang__dong--chon');
  });

  it('không dòng nào được đánh dấu khi chưa chọn dòng nào', () => {
    const html = veBangGioHang({ gioHang: [dongVi], chiSoDongChon: -1 });
    expect(html).not.toContain('gio-hang__dong--chon');
  });
});

// T-025 — nhiều hoá đơn song song (tab hoá đơn).
describe('taoTabRong', () => {
  it('tạo tab rỗng: giỏ hàng rỗng, chưa chọn dòng nào, panel thanh toán ở trạng thái mặc định', () => {
    const tab = taoTabRong('tab-1', 1);

    expect(tab).toEqual({
      id: 'tab-1',
      soThuTu: 1,
      gioHang: [],
      chiSoDongChon: -1,
      thanhToan: { giamGia: '0', thuKhac: '0', phuongThucThanhToan: 'TIEN_MAT', khachThanhToan: '' },
      dangThanhToan: false,
      loiThanhToan: undefined,
      thongBaoThanhToan: undefined,
    });
  });
});

describe('soThuTuTabTiepTheo', () => {
  it('danh sách rỗng → 1 (tab đầu tiên)', () => {
    expect(soThuTuTabTiepTheo([])).toBe(1);
  });

  it('lớn hơn số thứ tự lớn nhất đang có 1 đơn vị', () => {
    const tabs = [taoTabRong('a', 1), taoTabRong('b', 2)];
    expect(soThuTuTabTiepTheo(tabs)).toBe(3);
  });

  it('không tái sử dụng số đã đóng — vẫn tính theo số LỚN NHẤT đã từng cấp, không phải số lượng tab đang mở', () => {
    // Mô phỏng: đã từng mở tới "Hoá đơn 3" rồi đóng tab 1 và 2, chỉ còn tab 3.
    const tabs = [taoTabRong('c', 3)];
    expect(soThuTuTabTiepTheo(tabs)).toBe(4);
  });
});

describe('moTabMoi', () => {
  it('thêm một tab rỗng vào cuối, số thứ tự tiếp theo, không đổi tab nào đang có', () => {
    const tabs = [taoTabRong('a', 1)];
    const ketQua = moTabMoi(tabs, 'b');

    expect(ketQua.tabs).toHaveLength(2);
    expect(ketQua.tabs[0]).toBe(tabs[0]); // tab cũ giữ nguyên tham chiếu
    expect(ketQua.tabs[1]).toMatchObject({ id: 'b', soThuTu: 2, gioHang: [] });
    expect(ketQua.tabMoiId).toBe('b');
  });
});

describe('dongTab', () => {
  it('còn đúng một tab thì không đóng được — trả về nguyên trạng', () => {
    const tabs = [taoTabRong('a', 1)];
    expect(dongTab(tabs, 'a', 'a')).toEqual({ tabs, tabDangChonId: 'a' });
  });

  it('đóng một tab KHÔNG đang chọn — tab đang chọn giữ nguyên', () => {
    const tabs = [taoTabRong('a', 1), taoTabRong('b', 2)];
    const ketQua = dongTab(tabs, 'b', 'a');

    expect(ketQua.tabs.map((t) => t.id)).toEqual(['a']);
    expect(ketQua.tabDangChonId).toBe('a');
  });

  it('đóng tab ĐANG chọn ở giữa — chuyển sang tab liền kề bên trái', () => {
    const tabs = [taoTabRong('a', 1), taoTabRong('b', 2), taoTabRong('c', 3)];
    const ketQua = dongTab(tabs, 'b', 'b');

    expect(ketQua.tabs.map((t) => t.id)).toEqual(['a', 'c']);
    expect(ketQua.tabDangChonId).toBe('a');
  });

  it('đóng tab ĐẦU TIÊN đang chọn — chuyển sang tab kế tiếp (giờ là tab đầu)', () => {
    const tabs = [taoTabRong('a', 1), taoTabRong('b', 2)];
    const ketQua = dongTab(tabs, 'a', 'a');

    expect(ketQua.tabs.map((t) => t.id)).toEqual(['b']);
    expect(ketQua.tabDangChonId).toBe('b');
  });

  it('id không tồn tại thì không đổi gì', () => {
    const tabs = [taoTabRong('a', 1), taoTabRong('b', 2)];
    expect(dongTab(tabs, 'khong-ton-tai', 'a')).toEqual({ tabs, tabDangChonId: 'a' });
  });
});

describe('tabTheoViTri', () => {
  const tabs = [taoTabRong('a', 1), taoTabRong('b', 2), taoTabRong('c', 3)];

  it('Alt+1..9: lấy đúng tab theo VỊ TRÍ hiển thị (1-based)', () => {
    expect(tabTheoViTri(tabs, 1)?.id).toBe('a');
    expect(tabTheoViTri(tabs, 3)?.id).toBe('c');
  });

  it('vị trí vượt quá số tab đang mở → undefined, không đổi gì', () => {
    expect(tabTheoViTri(tabs, 9)).toBeUndefined();
  });
});

describe('capNhatTab — không lẫn dòng giữa các tab (T-025)', () => {
  it('chỉ sửa đúng tab theo id, tab khác giữ NGUYÊN THAM CHIẾU (bất biến)', () => {
    const tabs = [taoTabRong('a', 1), taoTabRong('b', 2)];
    const ketQua = capNhatTab(tabs, 'a', (t) => ({ ...t, gioHang: [dongVi] }));

    expect(ketQua[0]?.gioHang).toEqual([dongVi]);
    expect(ketQua[1]).toBe(tabs[1]); // tab 'b' không hề bị chạm tới
  });

  it('thêm hàng vào tab đang chọn không làm lẫn dòng sang tab khác đang có sẵn hàng', () => {
    // Tái hiện đúng ca "Xong khi" của T-025: hai tab đang mở song song, mỗi
    // tab đã có một dòng hàng RIÊNG — thêm tiếp vào tab A không được phép làm
    // xuất hiện dòng đó ở tab B, và ngược lại.
    let tabs: HoaDonTab[] = [taoTabRong('a', 1), taoTabRong('b', 2)];
    tabs = capNhatTab(tabs, 'a', (t) => ({ ...t, gioHang: themVaoGioHang(t.gioHang, goiYVi) }));
    tabs = capNhatTab(tabs, 'b', (t) => ({ ...t, gioHang: themVaoGioHang(t.gioHang, goiYHop) }));
    // Thêm một lần nữa vào tab A — mô phỏng gõ tiếp trong lúc tab B đang "gõ
    // dở" từ trước, đích thực của "chuyển tab không mất giỏ đang gõ dở".
    tabs = capNhatTab(tabs, 'a', (t) => ({ ...t, gioHang: themVaoGioHang(t.gioHang, goiYVi) }));

    const tabA = tabs.find((t) => t.id === 'a');
    const tabB = tabs.find((t) => t.id === 'b');

    expect(tabA?.gioHang).toEqual([{ ...themVaoGioHang([], goiYVi)[0]!, soLuong: 2 }]);
    expect(tabA?.gioHang.every((d) => d.donViTinhId === 'dvt-vi')).toBe(true);
    expect(tabB?.gioHang).toEqual([themVaoGioHang([], goiYHop)[0]]);
    expect(tabB?.gioHang.some((d) => d.donViTinhId === 'dvt-vi')).toBe(false);
  });
});

function veThanhTabHoaDon(props: Partial<ComponentProps<typeof ThanhTabHoaDon>> = {}) {
  return renderToStaticMarkup(
    <ThanhTabHoaDon
      tabs={[taoTabRong('a', 1)]}
      tabDangChonId="a"
      onChonTab={() => {}}
      onDongTab={() => {}}
      onMoTabMoi={() => {}}
      {...props}
    />,
  );
}

describe('ThanhTabHoaDon', () => {
  it('hiện nhãn "Hoá đơn N" cho từng tab, theo đúng số thứ tự', () => {
    const html = veThanhTabHoaDon({ tabs: [taoTabRong('a', 1), taoTabRong('b', 2)], tabDangChonId: 'a' });

    expect(html).toContain('Hoá đơn 1');
    expect(html).toContain('Hoá đơn 2');
  });

  it('tab đang chọn có aria-selected="true", tab khác thì "false"', () => {
    const html = veThanhTabHoaDon({ tabs: [taoTabRong('a', 1), taoTabRong('b', 2)], tabDangChonId: 'b' });
    // Mỗi tab là một `<div role="tab" aria-selected="…">` riêng — tách theo
    // dấu mở thẻ để đối chiếu đúng thuộc tính của TỪNG tab, không phải toàn
    // trang (hai tab dùng chung class gốc `ban-hang__tab`).
    const [, doanTabA, doanTabB] = html.split('<div role="tab"');

    expect(doanTabA).toContain('aria-selected="false"');
    expect(doanTabA).toContain('Hoá đơn 1');
    expect(doanTabB).toContain('aria-selected="true"');
    expect(doanTabB).toContain('Hoá đơn 2');
  });

  it('chỉ còn MỘT tab thì không có nút đóng — không đóng được tab hoá đơn cuối cùng', () => {
    const html = veThanhTabHoaDon({ tabs: [taoTabRong('a', 1)], tabDangChonId: 'a' });
    expect(html).not.toContain('ban-hang__tab-dong');
  });

  it('từ hai tab trở lên thì mỗi tab có nút đóng riêng', () => {
    const html = veThanhTabHoaDon({ tabs: [taoTabRong('a', 1), taoTabRong('b', 2)], tabDangChonId: 'a' });
    expect(html).toContain('Đóng Hoá đơn 1');
    expect(html).toContain('Đóng Hoá đơn 2');
  });

  it('luôn có nút mở tab mới (F7)', () => {
    const html = veThanhTabHoaDon();
    expect(html).toContain('Mở hoá đơn mới (F7)');
  });
});
