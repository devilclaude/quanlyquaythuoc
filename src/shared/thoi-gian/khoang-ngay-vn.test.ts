import { describe, expect, it } from 'vitest';
import { cuoiNgayVN, dauNgayVN, khoangThangNayVN } from './khoang-ngay-vn';

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
