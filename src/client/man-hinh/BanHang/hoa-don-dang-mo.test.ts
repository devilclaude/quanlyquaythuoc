import { describe, expect, it } from 'vitest';
import { docHoaDonDangMo, luuHoaDonDangMo, type HoaDonTabLuu } from './hoa-don-dang-mo';

function khoGia() {
  const du = new Map<string, string>();
  return {
    du,
    getItem: (k: string) => du.get(k) ?? null,
    setItem: (k: string, v: string) => void du.set(k, v),
    removeItem: (k: string) => void du.delete(k),
  };
}

const DONG = {
  sanPhamId: 'sp-1',
  maHang: 'SP000240',
  ten: 'Panadol Extra',
  donViTinhId: 'dvt-hop',
  donViTen: 'hộp',
  heSo: 15,
  giaBan: 260000,
  soLuong: 2,
  dsDonVi: [
    { id: 'dvt-vi', ten: 'vỉ', heSo: 1, laCoSo: true, giaBan: 17000 },
    { id: 'dvt-hop', ten: 'hộp', heSo: 15, laCoSo: false, giaBan: 260000 },
  ],
};

function tab(id: string, soThuTu: number, ghiDe: Partial<HoaDonTabLuu> = {}): HoaDonTabLuu {
  return {
    id,
    soThuTu,
    gioHang: [],
    chiSoDongChon: -1,
    thanhToan: { giamGia: '0', thuKhac: '0', phuongThucThanhToan: 'TIEN_MAT', khachThanhToan: '' },
    dangThanhToan: false,
    loiThanhToan: undefined,
    thongBaoThanhToan: undefined,
    ...ghiDe,
  };
}

describe('hoa-don-dang-mo', () => {
  it('lưu rồi đọc lại hai hoá đơn chưa thanh toán và tab đang chọn', () => {
    const kho = khoGia();
    const tabs = [
      tab('t1', 1, { gioHang: [DONG], chiSoDongChon: 0, thanhToan: { giamGia: '5000', thuKhac: '0', phuongThucThanhToan: 'TIEN_MAT', khachThanhToan: '300000' } }),
      tab('t2', 2, { gioHang: [{ ...DONG, soLuong: 1 }] }),
    ];

    luuHoaDonDangMo('u1', { tabs, tabDangChonId: 't2' }, kho);
    const doc = docHoaDonDangMo('u1', kho);

    expect(doc?.tabDangChonId).toBe('t2');
    expect(doc?.tabs).toEqual(tabs);
  });

  it('mỗi tài khoản có hoá đơn riêng', () => {
    const kho = khoGia();
    luuHoaDonDangMo('u1', { tabs: [tab('t1', 1, { gioHang: [DONG] })], tabDangChonId: 't1' }, kho);

    expect(docHoaDonDangMo('u2', kho)).toBeUndefined();
  });

  it('không lưu gì khi chỉ còn một hoá đơn rỗng, và xoá bản đã lưu trước đó', () => {
    const kho = khoGia();
    luuHoaDonDangMo('u1', { tabs: [tab('t1', 1, { gioHang: [DONG] })], tabDangChonId: 't1' }, kho);
    luuHoaDonDangMo('u1', { tabs: [tab('t1', 1)], tabDangChonId: 't1' }, kho);

    expect(kho.du.size).toBe(0);
  });

  it('dữ liệu hỏng hoặc sai dạng thì bỏ qua, không làm sập màn hình', () => {
    const kho = khoGia();
    kho.setItem('quaythuoc.hoa-don-dang-mo.u1', '{không phải json');
    expect(docHoaDonDangMo('u1', kho)).toBeUndefined();

    kho.setItem('quaythuoc.hoa-don-dang-mo.u1', JSON.stringify({ tabs: [{ id: 1 }], tabDangChonId: 'x' }));
    expect(docHoaDonDangMo('u1', kho)).toBeUndefined();
  });

  it('tab đang chọn không còn trong danh sách thì rơi về tab đầu', () => {
    const kho = khoGia();
    luuHoaDonDangMo('u1', { tabs: [tab('t1', 1, { gioHang: [DONG] })], tabDangChonId: 'da-dong' }, kho);

    expect(docHoaDonDangMo('u1', kho)?.tabDangChonId).toBe('t1');
  });

  it('tab đang dở thanh toán lúc tải lại: mở lại như chưa gửi nhưng cảnh báo kiểm tra trước khi thanh toán lại', () => {
    const kho = khoGia();
    luuHoaDonDangMo('u1', { tabs: [tab('t1', 1, { gioHang: [DONG], dangThanhToan: true })], tabDangChonId: 't1' }, kho);

    const t = docHoaDonDangMo('u1', kho)?.tabs[0];
    expect(t?.dangThanhToan).toBe(false);
    expect(t?.loiThanhToan).toContain('kiểm tra');
  });

  it('không có kho lưu (trình duyệt chặn) thì không lỗi', () => {
    expect(() => luuHoaDonDangMo('u1', { tabs: [tab('t1', 1, { gioHang: [DONG] })], tabDangChonId: 't1' }, undefined)).not.toThrow();
    expect(docHoaDonDangMo('u1', undefined)).toBeUndefined();
  });
});
