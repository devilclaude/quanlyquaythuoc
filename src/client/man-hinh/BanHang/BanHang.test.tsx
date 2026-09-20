import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HangHoaDanhSachItem } from '../../../shared/hop-dong/hang-hoa';
import {
  BangGioHang,
  DanhSachGoiY,
  capNhatEsc,
  diChuyenChiSoGoiY,
  dinhDangTonTheoDonVi,
  layGoiYTimHang,
  themVaoGioHang,
  tinhSoMon,
  tinhTongTien,
  type DongGioHang,
  type GoiYBanHang,
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

  it('mỗi đơn vị tính của một sản phẩm là một dòng gợi ý riêng, đơn vị cơ sở trước', () => {
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
};

const goiYHop: GoiYBanHang = { ...goiYVi, donViTinhId: 'dvt-hop', donViTen: 'hộp', heSo: 15, giaBan: 260000 };

describe('themVaoGioHang', () => {
  it('thêm dòng mới với số lượng 1 khi giỏ đang rỗng', () => {
    expect(themVaoGioHang([], goiYVi)).toEqual([
      {
        sanPhamId: 'sp-1',
        maHang: 'SP000240',
        ten: 'Panadol Extra',
        donViTinhId: 'dvt-vi',
        donViTen: 'vỉ',
        giaBan: 17000,
        soLuong: 1,
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

describe('tinhTongTien', () => {
  it('bằng 0 khi giỏ rỗng', () => {
    expect(tinhTongTien([])).toBe(0);
  });

  it('cộng đúng giá × số lượng qua nhiều dòng, không lệch đồng nào', () => {
    const gioHang: DongGioHang[] = [
      { sanPhamId: 'sp-1', maHang: 'SP1', ten: 'A', donViTinhId: 'd1', donViTen: 'vỉ', giaBan: 17000, soLuong: 2 },
      { sanPhamId: 'sp-2', maHang: 'SP2', ten: 'B', donViTinhId: 'd2', donViTen: 'hộp', giaBan: 260000, soLuong: 1 },
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
      { sanPhamId: 'sp-1', maHang: 'SP1', ten: 'A', donViTinhId: 'd1', donViTen: 'vỉ', giaBan: 17000, soLuong: 2 },
      { sanPhamId: 'sp-2', maHang: 'SP2', ten: 'B', donViTinhId: 'd2', donViTen: 'hộp', giaBan: 260000, soLuong: 1 },
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

function veBangGioHang(props: Partial<ComponentProps<typeof BangGioHang>> = {}) {
  return renderToStaticMarkup(<BangGioHang gioHang={[]} {...props} />);
}

describe('BangGioHang', () => {
  it('trạng thái rỗng hướng dẫn bấm F3 để tìm hàng', () => {
    expect(veBangGioHang()).toContain('F3');
  });

  it('thứ tự cột: STT, Mã hàng, Tên hàng, Đơn vị, Số lượng, Đơn giá, Thành tiền — khớp hàng đã thêm trong ảnh KiotViet', () => {
    const html = veBangGioHang({
      gioHang: [
        { sanPhamId: 'sp-1', maHang: 'SP000240', ten: 'Panadol Extra', donViTinhId: 'd1', donViTen: 'vỉ', giaBan: 17000, soLuong: 2 },
      ],
    });
    const viTri = ['STT', 'Mã hàng', 'Tên hàng', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Thành tiền'].map((c) =>
      html.indexOf(c),
    );

    expect(viTri.every((v) => v >= 0)).toBe(true);
    expect(viTri).toEqual([...viTri].sort((a, b) => a - b));
  });

  it('thành tiền từng dòng bằng đơn giá × số lượng, có dấu phẩy ngăn cách hàng nghìn', () => {
    const html = veBangGioHang({
      gioHang: [
        { sanPhamId: 'sp-1', maHang: 'SP000240', ten: 'Panadol Extra', donViTinhId: 'd1', donViTen: 'vỉ', giaBan: 17000, soLuong: 2 },
      ],
    });

    expect(html).toContain('34,000');
  });
});
