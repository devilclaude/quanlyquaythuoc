import { describe, expect, it } from 'vitest';
import { chiaLayThuongVaDu } from './chia-nguyen';

describe('chiaLayThuongVaDu', () => {
  it('chia hết', () => {
    expect(chiaLayThuongVaDu(900, 180)).toEqual({ thuong: 5, du: 0 });
  });

  it('chia có dư', () => {
    expect(chiaLayThuongVaDu(7, 2)).toEqual({ thuong: 3, du: 1 });
  });

  it('tử số bằng 0', () => {
    expect(chiaLayThuongVaDu(0, 5)).toEqual({ thuong: 0, du: 0 });
  });

  it('từ chối mẫu số bằng 0', () => {
    expect(() => chiaLayThuongVaDu(5, 0)).toThrow();
  });

  it('từ chối mẫu số âm', () => {
    expect(() => chiaLayThuongVaDu(5, -1)).toThrow();
  });

  it('từ chối tử số không nguyên', () => {
    expect(() => chiaLayThuongVaDu(5.5, 2)).toThrow();
  });
});
