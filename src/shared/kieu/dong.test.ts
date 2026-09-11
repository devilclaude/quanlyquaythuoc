import { describe, expect, it } from 'vitest';
import { dong, type Dong } from './dong';
import { soLuongCoSo } from './so-luong';

describe('dong', () => {
  it('tạo Dong hợp lệ từ số nguyên', () => {
    expect(dong(17000)).toBe(17000);
  });

  it('từ chối số thập phân', () => {
    expect(() => dong(17000.5)).toThrow();
  });

  it('gán SoLuongCoSo vào biến kiểu Dong là lỗi biên dịch', () => {
    // @ts-expect-error -- Dong và SoLuongCoSo không được lẫn cho nhau dù cùng là number lúc chạy
    const saiKieu: Dong = soLuongCoSo(17000);
    expect(saiKieu).toBeDefined();
  });
});
