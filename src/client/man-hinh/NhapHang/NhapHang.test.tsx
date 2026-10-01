import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HangHoaChiTietRes } from '../../../shared/hop-dong/hang-hoa';
import type { GoiYBanHang } from '../BanHang/BanHang';
import {
  BangDongPhieuNhap,
  doiDonViDongPhieuNhap,
  doiDonViKeTiepPhieuNhap,
  suaDonGiaDongPhieuNhap,
  suaHsdDongPhieuNhap,
  suaSoLoDongPhieuNhap,
  suaSoLuongDongPhieuNhap,
  themDongPhieuNhap,
  tinhTongTienHangPhieuNhap,
  validatePhieuNhap,
  xayDungGoiYTuHangMoiTao,
  xayDungYeuCauTaoPhieuNhap,
  xoaDongPhieuNhap,
  type DongPhieuNhapUI,
} from './NhapHang';

const donViVi = { id: 'dvt-vi', ten: 'vỉ', heSo: 1, laCoSo: true, giaBan: 17000 };
const donViHop = { id: 'dvt-hop', ten: 'hộp', heSo: 15, laCoSo: false, giaBan: 260000 };

const goiYPanadol: GoiYBanHang = {
  sanPhamId: 'sp-1',
  maHang: 'SP000240',
  ten: 'Panadol Extra hộp 15 vỉ x 12 viên nén GSK',
  donViTinhId: donViVi.id,
  donViTen: donViVi.ten,
  heSo: donViVi.heSo,
  giaBan: donViVi.giaBan,
  tonKhoCoSo: 41,
  dsDonVi: [donViVi, donViHop],
};

function dongMau(overrides: Partial<DongPhieuNhapUI> = {}): DongPhieuNhapUI {
  return {
    id: 'dong-1',
    sanPhamId: 'sp-1',
    maHang: 'SP000240',
    ten: 'Panadol Extra',
    donViTinhId: donViVi.id,
    donViTen: donViVi.ten,
    heSo: donViVi.heSo,
    donGia: 16000,
    soLuong: 2,
    soLo: '',
    hsd: '',
    quanLyLoBat: false,
    dsDonVi: [donViVi, donViHop],
    ...overrides,
  };
}

it('themDongPhieuNhap: dòng mới số lượng 1/đơn giá 0; chọn cùng gợi ý hai lần ra HAI dòng riêng (không gộp như giỏ hàng bán — mỗi dòng có thể mang lô/HSD khác nhau)', () => {
  expect(themDongPhieuNhap([], goiYPanadol, false, 'id-moi')).toEqual([
    {
      id: 'id-moi',
      sanPhamId: 'sp-1',
      maHang: 'SP000240',
      ten: 'Panadol Extra hộp 15 vỉ x 12 viên nén GSK',
      donViTinhId: 'dvt-vi',
      donViTen: 'vỉ',
      heSo: 1,
      donGia: 0,
      soLuong: 1,
      soLo: '',
      hsd: '',
      quanLyLoBat: false,
      dsDonVi: [donViVi, donViHop],
    },
  ]);

  const haiLan = themDongPhieuNhap(themDongPhieuNhap([], goiYPanadol, false, 'id-1'), goiYPanadol, false, 'id-2');
  expect(haiLan.map((d) => d.id)).toEqual(['id-1', 'id-2']);
});

it('xoaDongPhieuNhap xoá đúng dòng theo chỉ số, giữ nguyên các dòng khác', () => {
  const ds = [dongMau({ id: 'a' }), dongMau({ id: 'b' }), dongMau({ id: 'c' })];
  expect(xoaDongPhieuNhap(ds, 1).map((d) => d.id)).toEqual(['a', 'c']);
});

describe('xayDungGoiYTuHangMoiTao (T-040c2 — hàng vừa tạo ngay trong màn)', () => {
  const chiTietMau: HangHoaChiTietRes = {
    id: 'sp-moi',
    maHang: 'SP000999',
    ten: 'Vitamin C 500mg',
    giaBan: 2000,
    giaVon: 0,
    tonKho: 0,
    ngayTao: '2026-10-01T00:00:00.000Z',
    donViTinh: [
      { id: 'dvt-vien', ten: 'viên', heSo: 1, laCoSo: true, giaBan: 2000 },
      { id: 'dvt-hop', ten: 'hộp', heSo: 100, laCoSo: false, giaBan: 180000 },
    ],
    trangThai: 'HOAT_DONG',
    coTheXoaCung: true,
    quanLyLoGhiDe: 'KE_THUA',
  };

  it('lấy đúng đơn vị CƠ SỞ (không phải đơn vị khác) làm gợi ý duy nhất', () => {
    expect(xayDungGoiYTuHangMoiTao(chiTietMau)).toEqual({
      sanPhamId: 'sp-moi',
      maHang: 'SP000999',
      ten: 'Vitamin C 500mg',
      donViTinhId: 'dvt-vien',
      donViTen: 'viên',
      heSo: 1,
      giaBan: 2000,
      tonKhoCoSo: 0,
      dsDonVi: chiTietMau.donViTinh,
    });
  });

  it('không có đơn vị cơ sở (không xảy ra trong luồng thật) thì trả undefined, không ném lỗi', () => {
    const khongCoSo = { ...chiTietMau, donViTinh: chiTietMau.donViTinh.map((d) => ({ ...d, laCoSo: false })) };
    expect(xayDungGoiYTuHangMoiTao(khongCoSo)).toBeUndefined();
  });
});

it.each([
  [5, 5],
  [0, 2], // số lượng 0 bị từ chối, giữ nguyên cũ
  [-1, 2], // âm bị từ chối
  [1.5, 2], // không nguyên bị từ chối
])('suaSoLuongDongPhieuNhap — chỉ nhận số nguyên >= 1: sửa thành %i -> %i', (moi, kyVong) => {
  expect(suaSoLuongDongPhieuNhap([dongMau({ soLuong: 2 })], 0, moi)[0]!.soLuong).toBe(kyVong);
});

it('suaDonGiaDongPhieuNhap: chỉ nhận số nguyên >= 0 (0 hợp lệ — hàng khuyến mãi; âm bị từ chối)', () => {
  expect(suaDonGiaDongPhieuNhap([dongMau({ donGia: 1000 })], 0, 0)[0]!.donGia).toBe(0);
  expect(suaDonGiaDongPhieuNhap([dongMau({ donGia: 1000 })], 0, -500)[0]!.donGia).toBe(1000);
});

it('doiDonViDongPhieuNhap/doiDonViKeTiepPhieuNhap: đổi đơn vị KHÔNG đổi đơn giá theo (đơn giá tự gõ, khác giá bán suy theo hệ số); id lạ thì không đổi gì; F2 quay vòng, một đơn vị thì không đổi', () => {
  const ketQua = doiDonViDongPhieuNhap([dongMau({ donViTinhId: donViVi.id, donGia: 16000 })], 0, donViHop.id);
  expect(ketQua[0]).toMatchObject({ donViTinhId: donViHop.id, heSo: 15, donGia: 16000 });

  const ds = [dongMau({ donViTinhId: donViVi.id })];
  expect(doiDonViDongPhieuNhap(ds, 0, 'khong-ton-tai')).toEqual(ds);

  const dsHaiDv = [dongMau({ donViTinhId: donViVi.id, dsDonVi: [donViVi, donViHop] })];
  const sauMotLan = doiDonViKeTiepPhieuNhap(dsHaiDv, 0);
  expect(sauMotLan[0]!.donViTinhId).toBe(donViHop.id);
  expect(doiDonViKeTiepPhieuNhap(sauMotLan, 0)[0]!.donViTinhId).toBe(donViVi.id);

  const motDonVi = [dongMau({ dsDonVi: [donViVi] })];
  expect(doiDonViKeTiepPhieuNhap(motDonVi, 0)).toEqual(motDonVi);
});

it('tinhTongTienHangPhieuNhap: tổng = Σ đơn giá × số lượng từng dòng; phiếu rỗng ra 0', () => {
  const ds = [dongMau({ donGia: 32000, soLuong: 1 }), dongMau({ donGia: 16333, soLuong: 2 })];
  expect(tinhTongTienHangPhieuNhap(ds)).toBe(32000 + 16333 * 2);
  expect(tinhTongTienHangPhieuNhap([])).toBe(0);
});

it('validatePhieuNhap — ca biên bắt buộc: rỗng/số lượng 0/đơn giá âm/thiếu lô+HSD/chỉ khai một trong hai đều bị từ chối; đủ cả hai (bật) hay để trống cả hai (tắt, lô ngầm định) đều hợp lệ', () => {
  expect(validatePhieuNhap([])).toBeDefined();
  expect(validatePhieuNhap([dongMau({ soLuong: 0 })])).toMatch(/Số lượng/);
  expect(validatePhieuNhap([dongMau({ donGia: -1 })])).toMatch(/Đơn giá/);
  expect(validatePhieuNhap([dongMau({ quanLyLoBat: true, soLo: '', hsd: '' })])).toMatch(/thiếu số lô/);
  expect(validatePhieuNhap([dongMau({ quanLyLoBat: true, soLo: 'L01', hsd: '' })])).toMatch(/thiếu số lô/);
  expect(validatePhieuNhap([dongMau({ quanLyLoBat: false, soLo: '', hsd: '2027-01-01' })])).toMatch(/đủ cả số lô/);
  expect(validatePhieuNhap([dongMau({ quanLyLoBat: false, soLo: 'L01', hsd: '' })])).toMatch(/đủ cả số lô/);
  expect(validatePhieuNhap([dongMau({ quanLyLoBat: true, soLo: 'L01', hsd: '2027-01-01' })])).toBeUndefined();
  expect(validatePhieuNhap([dongMau({ quanLyLoBat: false, soLo: '', hsd: '' })])).toBeUndefined();
});

it('xayDungYeuCauTaoPhieuNhap: quy đổi đơn vị lẻ đúng; chế độ phẳng KHÔNG gửi soLo/hsd rỗng; có lô/HSD thì gửi giá trị đã trim', () => {
  const ds = [dongMau({ sanPhamId: 'sp-1', donViTen: 'hộp', heSo: 15, donGia: 260000, soLuong: 5 })];
  expect(xayDungYeuCauTaoPhieuNhap(ds, true)).toEqual({
    hoanThanhNgay: true,
    dong: [{ sanPhamId: 'sp-1', donViTen: 'hộp', heSo: 15, donGia: 260000, soLuong: 5 }],
  });

  const phang = xayDungYeuCauTaoPhieuNhap([dongMau({ soLo: '', hsd: '' })], false);
  expect(phang.dong[0]).not.toHaveProperty('soLo');
  expect(phang.dong[0]).not.toHaveProperty('hsd');

  const coLo = xayDungYeuCauTaoPhieuNhap([dongMau({ quanLyLoBat: true, soLo: '  L01  ', hsd: '2027-01-01' })], true);
  expect(coLo.dong[0]).toMatchObject({ soLo: 'L01', hsd: '2027-01-01' });
});

it('suaSoLoDongPhieuNhap / suaHsdDongPhieuNhap sửa đúng dòng theo chỉ số, không đụng dòng khác', () => {
  const ds = [dongMau({ id: 'a', soLo: '', hsd: '' }), dongMau({ id: 'b', soLo: '', hsd: '' })];
  const sauSoLo = suaSoLoDongPhieuNhap(ds, 0, 'L01');
  expect(sauSoLo[0]!.soLo).toBe('L01');
  expect(sauSoLo[1]!.soLo).toBe('');
  expect(suaHsdDongPhieuNhap(ds, 0, '2027-06-30')[0]!.hsd).toBe('2027-06-30');
});

describe('BangDongPhieuNhap — hiển thị thuần', () => {
  const props = {
    chiSoDongChon: -1,
    onChonDong: () => undefined,
    onDoiDonVi: () => undefined,
    onSuaSoLuong: () => undefined,
    onSuaDonGia: () => undefined,
    onSuaSoLo: () => undefined,
    onSuaHsd: () => undefined,
    onXoaDong: () => undefined,
  };

  it('phiếu rỗng hiện hướng dẫn, không có bảng', () => {
    const html = renderToStaticMarkup(<BangDongPhieuNhap dsDong={[]} {...props} />);
    expect(html).toContain('Chưa có hàng trong phiếu');
    expect(html).not.toContain('<table');
  });

  it('cột Số lô/Hạn dùng chỉ HIỆN khi có ít nhất một dòng bật quản lý lô; dòng phẳng khác hiện "—"', () => {
    const anHet = renderToStaticMarkup(<BangDongPhieuNhap dsDong={[dongMau({ quanLyLoBat: false })]} {...props} />);
    expect(anHet).not.toContain('Số lô');

    const hienMot = renderToStaticMarkup(
      <BangDongPhieuNhap
        dsDong={[
          dongMau({ id: 'a', quanLyLoBat: true, soLo: 'L01', hsd: '2027-01-01' }),
          dongMau({ id: 'b', quanLyLoBat: false }),
        ]}
        {...props}
      />,
    );
    expect(hienMot).toContain('Số lô');
    expect(hienMot).toContain('Hạn dùng');
    expect(hienMot).toContain('phieu-nhap__khong-ap-dung');
  });
});
