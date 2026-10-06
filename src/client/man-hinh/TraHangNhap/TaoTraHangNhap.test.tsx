import { describe, expect, it } from 'vitest';
import type { PhieuNhapDongDeTraHangNhapItem } from '../../../shared/hop-dong/tra-hang-nhap';
import { suaSoLuongTraHangNhap, validateTraHangNhap, xayDungYeuCauTraHangNhap } from './TaoTraHangNhap';

// T-053c2 — luồng tạo trả hàng nhập: test các hàm thuần TRƯỚC khi dựng
// container (TDD), cùng khuôn `TaoTraHang.test.tsx` (T-052d). `dongMau` có một
// dòng hệ số > 1 (hộp = 15 viên) để khoá đúng phép quy đổi đơn vị lẻ khi xây
// yêu cầu gửi server (SPEC.md §3.3 — chỉ nhân, không chia).
const dongMau: PhieuNhapDongDeTraHangNhapItem[] = [
  { id: 'pnd-1', sanPhamId: 'sp-1', maHang: 'SP001', ten: 'Panadol Extra', donViTen: 'hộp', heSo: 15, soLuongDaNhap: 10, conLaiToiDa: 6 },
  { id: 'pnd-2', sanPhamId: 'sp-2', maHang: 'SP002', ten: 'Vitamin C', donViTen: 'vỉ', heSo: 1, soLuongDaNhap: 4, conLaiToiDa: 4 },
];

describe('suaSoLuongTraHangNhap', () => {
  it('cập nhật số lượng hợp lệ cho đúng dòng', () => {
    expect(suaSoLuongTraHangNhap({}, dongMau, 'pnd-1', 2)).toEqual({ 'pnd-1': 2 });
  });

  it('bỏ qua số lượng âm', () => {
    expect(suaSoLuongTraHangNhap({ 'pnd-1': 2 }, dongMau, 'pnd-1', -1)).toEqual({ 'pnd-1': 2 });
  });

  it('bỏ qua số lượng không nguyên', () => {
    expect(suaSoLuongTraHangNhap({}, dongMau, 'pnd-1', 1.5)).toEqual({});
  });

  it('bỏ qua số lượng vượt "còn trả được tối đa" của đúng dòng đó', () => {
    expect(suaSoLuongTraHangNhap({}, dongMau, 'pnd-1', 7)).toEqual({});
    expect(suaSoLuongTraHangNhap({}, dongMau, 'pnd-1', 6)).toEqual({ 'pnd-1': 6 });
  });

  it('cho phép số lượng 0 — nghĩa là bỏ trả dòng này', () => {
    expect(suaSoLuongTraHangNhap({ 'pnd-1': 3 }, dongMau, 'pnd-1', 0)).toEqual({ 'pnd-1': 0 });
  });

  it('bỏ qua khi dòng không tồn tại trong phiếu nhập', () => {
    expect(suaSoLuongTraHangNhap({}, dongMau, 'pnd-khong-co', 1)).toEqual({});
  });
});

describe('validateTraHangNhap', () => {
  it('chưa nhập số lượng trả cho dòng nào thì báo lỗi (map rỗng)', () => {
    expect(validateTraHangNhap(dongMau, {})).toMatch(/chưa nhập/i);
  });

  it('toàn bộ dòng đều 0 cũng báo lỗi như chưa nhập', () => {
    expect(validateTraHangNhap(dongMau, { 'pnd-1': 0, 'pnd-2': 0 })).toMatch(/chưa nhập/i);
  });

  it('có ít nhất một dòng > 0 trong giới hạn thì hợp lệ', () => {
    expect(validateTraHangNhap(dongMau, { 'pnd-1': 2 })).toBeUndefined();
  });
});

describe('xayDungYeuCauTraHangNhap', () => {
  it('chỉ gửi dòng có số lượng > 0, quy đổi đúng sang đơn vị cơ sở theo hệ số (2 hộp × 15 = 30 viên)', () => {
    const req = xayDungYeuCauTraHangNhap('pn-1', dongMau, { 'pnd-1': 2, 'pnd-2': 0 });
    expect(req).toEqual({ phieuNhapId: 'pn-1', dong: [{ phieuNhapDongId: 'pnd-1', soLuong: 30 }] });
  });

  it('hệ số 1 (đơn vị cơ sở) giữ nguyên số lượng', () => {
    const req = xayDungYeuCauTraHangNhap('pn-1', dongMau, { 'pnd-2': 3 });
    expect(req.dong).toEqual([{ phieuNhapDongId: 'pnd-2', soLuong: 3 }]);
  });

  it('không có dòng nào > 0 thì dong rỗng', () => {
    expect(xayDungYeuCauTraHangNhap('pn-1', dongMau, {}).dong).toEqual([]);
  });
});
