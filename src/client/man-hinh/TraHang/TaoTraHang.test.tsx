import { describe, expect, it } from 'vitest';
import type { HoaDonDongDeTraHangItem } from '../../../shared/hop-dong/tra-hang';
import { suaSoLuongTra, validateTraHang, xayDungYeuCauTraHang } from './TaoTraHang';

// T-052d — luồng tạo trả hàng: test các hàm thuần TRƯỚC khi dựng container
// (TDD). `dongMau` có một dòng hệ số > 1 (hộp = 15 viên) để khoá đúng phép quy
// đổi đơn vị lẻ khi xây yêu cầu gửi server (SPEC.md §3.3 — chỉ nhân, không chia).
const dongMau: HoaDonDongDeTraHangItem[] = [
  { id: 'hdd-1', sanPhamId: 'sp-1', maHang: 'SP001', ten: 'Panadol Extra', donViTen: 'hộp', heSo: 15, soLuongDaBan: 10, conLaiToiDa: 6 },
  { id: 'hdd-2', sanPhamId: 'sp-2', maHang: 'SP002', ten: 'Vitamin C', donViTen: 'vỉ', heSo: 1, soLuongDaBan: 4, conLaiToiDa: 4 },
];

describe('suaSoLuongTra', () => {
  it('cập nhật số lượng hợp lệ cho đúng dòng', () => {
    expect(suaSoLuongTra({}, dongMau, 'hdd-1', 2)).toEqual({ 'hdd-1': 2 });
  });

  it('bỏ qua số lượng âm', () => {
    expect(suaSoLuongTra({ 'hdd-1': 2 }, dongMau, 'hdd-1', -1)).toEqual({ 'hdd-1': 2 });
  });

  it('bỏ qua số lượng không nguyên', () => {
    expect(suaSoLuongTra({}, dongMau, 'hdd-1', 1.5)).toEqual({});
  });

  it('bỏ qua số lượng vượt "còn trả được tối đa" của đúng dòng đó', () => {
    expect(suaSoLuongTra({}, dongMau, 'hdd-1', 7)).toEqual({});
    expect(suaSoLuongTra({}, dongMau, 'hdd-1', 6)).toEqual({ 'hdd-1': 6 });
  });

  it('cho phép số lượng 0 — nghĩa là bỏ trả dòng này', () => {
    expect(suaSoLuongTra({ 'hdd-1': 3 }, dongMau, 'hdd-1', 0)).toEqual({ 'hdd-1': 0 });
  });

  it('bỏ qua khi dòng không tồn tại trong hoá đơn', () => {
    expect(suaSoLuongTra({}, dongMau, 'hdd-khong-co', 1)).toEqual({});
  });
});

describe('validateTraHang', () => {
  it('chưa nhập số lượng trả cho dòng nào thì báo lỗi (map rỗng)', () => {
    expect(validateTraHang(dongMau, {})).toMatch(/chưa nhập/i);
  });

  it('toàn bộ dòng đều 0 cũng báo lỗi như chưa nhập', () => {
    expect(validateTraHang(dongMau, { 'hdd-1': 0, 'hdd-2': 0 })).toMatch(/chưa nhập/i);
  });

  it('có ít nhất một dòng > 0 trong giới hạn thì hợp lệ', () => {
    expect(validateTraHang(dongMau, { 'hdd-1': 2 })).toBeUndefined();
  });
});

describe('xayDungYeuCauTraHang', () => {
  it('chỉ gửi dòng có số lượng > 0, quy đổi đúng sang đơn vị cơ sở theo hệ số (2 hộp × 15 = 30 viên)', () => {
    const req = xayDungYeuCauTraHang('hd-1', dongMau, { 'hdd-1': 2, 'hdd-2': 0 });
    expect(req).toEqual({ hoaDonId: 'hd-1', dong: [{ hoaDonDongId: 'hdd-1', soLuong: 30 }] });
  });

  it('hệ số 1 (đơn vị cơ sở) giữ nguyên số lượng', () => {
    const req = xayDungYeuCauTraHang('hd-1', dongMau, { 'hdd-2': 3 });
    expect(req.dong).toEqual([{ hoaDonDongId: 'hdd-2', soLuong: 3 }]);
  });

  it('không có dòng nào > 0 thì dong rỗng', () => {
    expect(xayDungYeuCauTraHang('hd-1', dongMau, {}).dong).toEqual([]);
  });
});
