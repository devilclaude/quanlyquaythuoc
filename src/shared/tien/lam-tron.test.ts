import { describe, expect, it } from 'vitest';
import { chiaLamTronNuaLen } from './lam-tron';

describe('chiaLamTronNuaLen', () => {
  it('làm tròn xuống khi phần dư dưới nửa', () => {
    // 300000 / 7 = 42857.142857...
    expect(chiaLamTronNuaLen(300_000, 7)).toBe(42_857);
  });

  it('làm tròn lên khi phần dư đúng một nửa', () => {
    // 1 / 2 = 0.5 → nửa lên → 1
    expect(chiaLamTronNuaLen(1, 2)).toBe(1);
  });

  it('làm tròn lên khi phần dư trên nửa', () => {
    // 7000 * 10000 / 60000 = 1166.666...
    expect(chiaLamTronNuaLen(70_000_000, 60_000)).toBe(1167);
  });

  it('chia hết không đổi', () => {
    expect(chiaLamTronNuaLen(900, 180)).toBe(5);
  });

  it('tử số bằng 0', () => {
    expect(chiaLamTronNuaLen(0, 5)).toBe(0);
  });

  it('từ chối mẫu số không dương', () => {
    expect(() => chiaLamTronNuaLen(100, 0)).toThrow();
  });
});
