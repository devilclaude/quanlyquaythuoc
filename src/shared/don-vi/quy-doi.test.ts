import { describe, expect, it } from 'vitest';
import { soLuongCoSo, soLuongHienThi, type SoLuongHienThi } from '../kieu/so-luong';
import { hienThiGanDung, kiemTraHeSo, quyDoiSangCoSo, quyDoiTuCoSo } from './quy-doi';

describe('kiemTraHeSo', () => {
  it('chấp nhận hệ số nguyên >= 1', () => {
    expect(() => kiemTraHeSo(1)).not.toThrow();
    expect(() => kiemTraHeSo(180)).not.toThrow();
  });

  it('từ chối hệ số bằng 0', () => {
    expect(() => kiemTraHeSo(0)).toThrow();
  });

  it('từ chối hệ số âm', () => {
    expect(() => kiemTraHeSo(-1)).toThrow();
  });

  it('từ chối hệ số không nguyên', () => {
    expect(() => kiemTraHeSo(1.5)).toThrow();
  });
});

describe('quyDoiSangCoSo', () => {
  it('SPEC.md §3.3 — nhập 5 hộp (hệ số 180) ra 900 viên', () => {
    expect(quyDoiSangCoSo(soLuongHienThi(5), 180)).toBe(900);
  });

  it('SPEC.md §3.3 — bán 3 vỉ (hệ số 12) ra 36 viên', () => {
    expect(quyDoiSangCoSo(soLuongHienThi(3), 12)).toBe(36);
  });

  it('SPEC.md §3.3 — nhập 5 hộp rồi bán 3 vỉ, tồn còn đúng 864 viên', () => {
    const nhap = quyDoiSangCoSo(soLuongHienThi(5), 180);
    const ban = quyDoiSangCoSo(soLuongHienThi(3), 12);
    expect(nhap - ban).toBe(864);
  });

  it('từ chối hệ số không hợp lệ', () => {
    expect(() => quyDoiSangCoSo(soLuongHienThi(5), 0)).toThrow();
  });
});

describe('quyDoiTuCoSo', () => {
  it('864 viên quy đổi ra hộp (hệ số 180): 4 hộp dư 144 viên', () => {
    expect(quyDoiTuCoSo(soLuongCoSo(864), 180)).toEqual({
      soLuong: 4,
      duCoSo: 144,
    });
  });

  it('864 viên quy đổi ra vỉ (hệ số 12): 72 vỉ dư 0', () => {
    expect(quyDoiTuCoSo(soLuongCoSo(864), 12)).toEqual({
      soLuong: 72,
      duCoSo: 0,
    });
  });

  it('quy đổi hai chiều: sang cơ sở rồi quy đổi ngược lại ra đúng số ban đầu khi chia hết', () => {
    const soLuongGoc: SoLuongHienThi = soLuongHienThi(5);
    const coSo = quyDoiSangCoSo(soLuongGoc, 180);
    expect(quyDoiTuCoSo(coSo, 180)).toEqual({ soLuong: 5, duCoSo: 0 });
  });

  it('từ chối hệ số không hợp lệ', () => {
    expect(() => quyDoiTuCoSo(soLuongCoSo(864), -1)).toThrow();
  });
});

describe('hienThiGanDung', () => {
  it('864 viên hiển thị phụ theo hộp (hệ số 180) là "≈ 4,8 hộp"', () => {
    expect(hienThiGanDung(soLuongCoSo(864), 180, 'hộp')).toBe('≈ 4,8 hộp');
  });

  it('900 viên hiển thị phụ theo hộp (hệ số 180) là "≈ 5,0 hộp"', () => {
    expect(hienThiGanDung(soLuongCoSo(900), 180, 'hộp')).toBe('≈ 5,0 hộp');
  });

  it('trả về string, không phải số lượng có thể quay lại tính toán', () => {
    const ketQua = hienThiGanDung(soLuongCoSo(864), 180, 'hộp');
    expect(typeof ketQua).toBe('string');
    // @ts-expect-error -- hiển thị gần đúng là string, không được gán ngược vào SoLuongHienThi
    const saiKieu: SoLuongHienThi = ketQua;
    expect(saiKieu).toBeDefined();
  });
});
