import { describe, expect, it } from 'vitest';
import { giaiNghiaCaiDatQuanLyLo } from './giai-nghia';

describe('giaiNghiaCaiDatQuanLyLo', () => {
  it('KE_THUA thì theo đúng cài đặt toàn cục — toàn cục BẬT', () => {
    expect(giaiNghiaCaiDatQuanLyLo(true, 'KE_THUA')).toBe(true);
  });

  it('KE_THUA thì theo đúng cài đặt toàn cục — toàn cục TẮT', () => {
    expect(giaiNghiaCaiDatQuanLyLo(false, 'KE_THUA')).toBe(false);
  });

  it('ghi đè BAT luôn BẬT bất kể cài đặt toàn cục', () => {
    expect(giaiNghiaCaiDatQuanLyLo(false, 'BAT')).toBe(true);
    expect(giaiNghiaCaiDatQuanLyLo(true, 'BAT')).toBe(true);
  });

  it('ghi đè TAT luôn TẮT bất kể cài đặt toàn cục', () => {
    expect(giaiNghiaCaiDatQuanLyLo(true, 'TAT')).toBe(false);
    expect(giaiNghiaCaiDatQuanLyLo(false, 'TAT')).toBe(false);
  });
});
