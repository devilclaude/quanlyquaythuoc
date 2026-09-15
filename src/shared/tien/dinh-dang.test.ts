import { describe, expect, it } from 'vitest';
import { dong } from '../kieu/dong';
import { dinhDangSo, dinhDangTien } from './dinh-dang';

describe('dinhDangSo', () => {
  it('chèn dấu phẩy ngăn cách hàng nghìn cho số lượng/tồn kho, không phải chỉ tiền', () => {
    expect(dinhDangSo(1000)).toBe('1,000');
  });
});

describe('dinhDangTien', () => {
  it('chèn dấu phẩy ngăn cách hàng nghìn, khớp cách KiotViet hiển thị', () => {
    expect(dinhDangTien(dong(150_000))).toBe('150,000');
  });

  it('số dưới 1000 không có dấu phẩy', () => {
    expect(dinhDangTien(dong(500))).toBe('500');
  });

  it('bằng 0 hiển thị "0", không phải rỗng', () => {
    expect(dinhDangTien(dong(0))).toBe('0');
  });

  it('số lớn nhiều nhóm ba chữ số vẫn đúng', () => {
    expect(dinhDangTien(dong(1_400_000))).toBe('1,400,000');
  });
});
