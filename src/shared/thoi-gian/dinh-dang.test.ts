import { describe, expect, it } from 'vitest';
import { dinhDangThoiGianVN } from './dinh-dang';

describe('dinhDangThoiGianVN', () => {
  it('quy đổi giờ UTC sang giờ Việt Nam (UTC+7), định dạng dd/MM/yyyy HH:mm', () => {
    expect(dinhDangThoiGianVN('2026-09-01T02:00:00.000Z')).toBe('01/09/2026 09:00');
  });

  it('cộng giờ tràn sang ngày hôm sau vẫn ra đúng ngày giờ Việt Nam', () => {
    expect(dinhDangThoiGianVN('2026-09-01T18:00:00.000Z')).toBe('02/09/2026 01:00');
  });
});
