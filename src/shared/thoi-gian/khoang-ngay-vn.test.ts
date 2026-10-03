import { describe, expect, it } from 'vitest';
import { cuoiNgayVN, dauNgayVN, khoangThangNayVN, ngayHomNayVN, soNgayGiuaHaiNgayVN } from './khoang-ngay-vn';

describe('dauNgayVN', () => {
  it('00:00:00 giờ Việt Nam của một ngày = 17:00 UTC ngày hôm trước', () => {
    expect(dauNgayVN('2026-10-05')).toBe('2026-10-04T17:00:00.000Z');
  });
});

describe('cuoiNgayVN', () => {
  it('23:59:59.999 giờ Việt Nam của một ngày = 16:59:59.999 UTC cùng ngày', () => {
    expect(cuoiNgayVN('2026-10-05')).toBe('2026-10-05T16:59:59.999Z');
  });
});

describe('khoangThangNayVN', () => {
  it('tháng giữa năm: khoảng từ 00:00 ngày 1 đến 23:59:59.999 ngày cuối tháng, giờ Việt Nam', () => {
    // 2026-10-15T08:00:00Z = 2026-10-15 15:00 giờ VN — giữa tháng 10.
    expect(khoangThangNayVN(new Date('2026-10-15T08:00:00.000Z'))).toEqual({
      tu: '2026-09-30T17:00:00.000Z', // 2026-10-01 00:00 VN
      den: '2026-10-31T16:59:59.999Z', // 2026-10-31 23:59:59.999 VN
    });
  });

  it('tháng 12: cuối khoảng vắt sang ngày đầu năm sau (năm/tháng tràn)', () => {
    // 2026-12-20T10:00:00Z = 2026-12-20 17:00 giờ VN — giữa tháng 12.
    expect(khoangThangNayVN(new Date('2026-12-20T10:00:00.000Z'))).toEqual({
      tu: '2026-11-30T17:00:00.000Z', // 2026-12-01 00:00 VN
      den: '2026-12-31T16:59:59.999Z', // 2026-12-31 23:59:59.999 VN
    });
  });
});

describe('ngayHomNayVN', () => {
  it('17:00 UTC đã là ngày hôm sau giờ Việt Nam (UTC+7)', () => {
    expect(ngayHomNayVN(new Date('2026-10-03T17:00:00.000Z'))).toBe('2026-10-04');
  });

  it('16:59:59.999 UTC vẫn là ngày hôm đó giờ Việt Nam', () => {
    expect(ngayHomNayVN(new Date('2026-10-03T16:59:59.999Z'))).toBe('2026-10-03');
  });
});

describe('soNgayGiuaHaiNgayVN', () => {
  it('cùng một ngày thì cách 0 ngày', () => {
    expect(soNgayGiuaHaiNgayVN('2026-10-03', '2026-10-03')).toBe(0);
  });

  it('ngày sau dương, số ngày là khoảng cách dương', () => {
    expect(soNgayGiuaHaiNgayVN('2026-10-03', '2027-01-01')).toBe(90);
  });

  it('ngày trước (đã qua) ra số âm', () => {
    expect(soNgayGiuaHaiNgayVN('2026-10-03', '2026-09-01')).toBe(-32);
  });

  it('vắt qua năm nhuận vẫn tính đúng', () => {
    // 2028 là năm nhuận — từ 2028-02-01 tới 2028-03-01 là 29 ngày (có 29/2).
    expect(soNgayGiuaHaiNgayVN('2028-02-01', '2028-03-01')).toBe(29);
  });
});
