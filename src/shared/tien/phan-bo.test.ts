import { describe, expect, it } from 'vitest';
import { dong } from '../kieu/dong';
import { phanBoSoDuLonNhat } from './phan-bo';

describe('phanBoSoDuLonNhat', () => {
  it('SPEC §3.4: giảm giá 7.000 trên hoá đơn 10.000/20.000/30.000 ra 1.167/2.333/3.500', () => {
    const ketQua = phanBoSoDuLonNhat(dong(7000), [dong(10_000), dong(20_000), dong(30_000)]);

    expect(ketQua).toEqual([dong(1167), dong(2333), dong(3500)]);
  });

  it('tổng các phần luôn bằng đúng tổng gốc, không lệch 1đ', () => {
    const ketQua = phanBoSoDuLonNhat(dong(100), [dong(1), dong(1), dong(1)]);
    const tong = ketQua.reduce((t, x) => t + x, 0);

    expect(tong).toBe(100);
  });

  it('một dòng duy nhất nhận trọn tổng', () => {
    expect(phanBoSoDuLonNhat(dong(5000), [dong(1)])).toEqual([dong(5000)]);
  });

  it('tổng cần phân bổ bằng 0 thì mọi dòng nhận 0', () => {
    expect(phanBoSoDuLonNhat(dong(0), [dong(10_000), dong(20_000)])).toEqual([dong(0), dong(0)]);
  });

  it('mảng trọng số rỗng và tổng bằng 0 thì trả về mảng rỗng', () => {
    expect(phanBoSoDuLonNhat(dong(0), [])).toEqual([]);
  });

  it('mảng trọng số toàn 0 và tổng bằng 0 thì mọi dòng nhận 0', () => {
    expect(phanBoSoDuLonNhat(dong(0), [dong(0), dong(0)])).toEqual([dong(0), dong(0)]);
  });

  it('từ chối khi mảng trọng số rỗng nhưng tổng khác 0', () => {
    expect(() => phanBoSoDuLonNhat(dong(100), [])).toThrow();
  });

  it('từ chối khi tổng trọng số bằng 0 nhưng tổng cần phân bổ khác 0', () => {
    expect(() => phanBoSoDuLonNhat(dong(100), [dong(0), dong(0)])).toThrow();
  });
});
