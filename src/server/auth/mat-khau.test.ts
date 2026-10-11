import { describe, expect, it } from 'vitest';
import { BAM_GIA, bamMatKhau, kiemTraMatKhau } from './mat-khau';

describe('bamMatKhau / kiemTraMatKhau', () => {
  it('mật khẩu đúng thì khớp', () => {
    const bam = bamMatKhau('mat-khau-dai-du');

    expect(kiemTraMatKhau('mat-khau-dai-du', bam)).toBe(true);
  });

  it('mật khẩu sai thì không khớp', () => {
    const bam = bamMatKhau('mat-khau-dai-du');

    expect(kiemTraMatKhau('mat-khau-khac', bam)).toBe(false);
  });

  it('hai lần băm cùng mật khẩu ra chuỗi khác nhau (muối ngẫu nhiên) nhưng đều khớp', () => {
    const a = bamMatKhau('mat-khau-dai-du');
    const b = bamMatKhau('mat-khau-dai-du');

    expect(a).not.toBe(b);
    expect(kiemTraMatKhau('mat-khau-dai-du', a)).toBe(true);
    expect(kiemTraMatKhau('mat-khau-dai-du', b)).toBe(true);
  });

  it('chuỗi băm không đúng định dạng thì trả false, không ném lỗi', () => {
    expect(kiemTraMatKhau('x', '')).toBe(false);
    expect(kiemTraMatKhau('x', 'khong-phai-bam')).toBe(false);
    expect(kiemTraMatKhau('x', 'scrypt$1$2$3$zz$zz')).toBe(false);
  });

  it('chuỗi băm không chứa mật khẩu gốc', () => {
    expect(bamMatKhau('mat-khau-dai-du')).not.toContain('mat-khau-dai-du');
  });

  it('BAM_GIA là chuỗi băm hợp lệ nhưng không khớp mật khẩu thường gặp', () => {
    expect(BAM_GIA.startsWith('scrypt$')).toBe(true);
    expect(kiemTraMatKhau('password', BAM_GIA)).toBe(false);
  });
});
