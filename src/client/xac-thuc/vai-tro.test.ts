import { describe, expect, it } from 'vitest';
import { cacManChoPhep, manMacDinh } from './vai-tro';

describe('cacManChoPhep', () => {
  it('ADMIN thấy đủ 7 màn theo đúng thứ tự menu', () => {
    expect(cacManChoPhep('ADMIN')).toEqual([
      'ban-hang',
      'hang-hoa',
      'nhap-hang',
      'tra-hang',
      'tra-hang-nhap',
      'tong-quan',
      'cai-dat',
    ]);
  });

  it('NHAN_VIEN chỉ thấy Bán hàng và Trả hàng', () => {
    expect(cacManChoPhep('NHAN_VIEN')).toEqual(['ban-hang', 'tra-hang']);
  });

  it('màn mặc định luôn nằm trong danh sách của mọi vai trò', () => {
    expect(cacManChoPhep('ADMIN')).toContain(manMacDinh);
    expect(cacManChoPhep('NHAN_VIEN')).toContain(manMacDinh);
  });
});
