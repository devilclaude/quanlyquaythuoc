import { describe, expect, it } from 'vitest';
import { dong } from './dong';
import { soLuongCoSo, soLuongHienThi, type SoLuongCoSo, type SoLuongHienThi } from './so-luong';

describe('soLuongCoSo', () => {
  it('tạo hợp lệ từ số nguyên', () => {
    expect(soLuongCoSo(864)).toBe(864);
  });

  it('từ chối số thập phân', () => {
    expect(() => soLuongCoSo(4.8)).toThrow();
  });
});

describe('soLuongHienThi', () => {
  it('tạo hợp lệ từ số nguyên', () => {
    expect(soLuongHienThi(5)).toBe(5);
  });

  it('từ chối số thập phân', () => {
    expect(() => soLuongHienThi(4.8)).toThrow();
  });
});

describe('phân biệt kiểu', () => {
  it('gán Dong vào biến kiểu SoLuongCoSo là lỗi biên dịch', () => {
    // @ts-expect-error -- SoLuongCoSo và Dong không được lẫn cho nhau dù cùng là number lúc chạy
    const saiKieu: SoLuongCoSo = dong(864);
    expect(saiKieu).toBeDefined();
  });

  it('gán SoLuongCoSo vào biến kiểu SoLuongHienThi là lỗi biên dịch', () => {
    // @ts-expect-error -- đơn vị cơ sở và đơn vị hiển thị không được lẫn dù cùng là number lúc chạy
    const saiKieu: SoLuongHienThi = soLuongCoSo(864);
    expect(saiKieu).toBeDefined();
  });
});
