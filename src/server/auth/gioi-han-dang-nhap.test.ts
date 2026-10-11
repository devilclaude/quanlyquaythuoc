import { describe, expect, it } from 'vitest';
import { taoGioiHanDangNhap } from './gioi-han-dang-nhap';

const T0 = 1_000_000;
const PHUT = 60 * 1000;

describe('taoGioiHanDangNhap', () => {
  it('cho phép khi chưa thất bại lần nào', () => {
    expect(taoGioiHanDangNhap().kiemTra('lan|1.2.3.4', T0)).toEqual({ duocPhep: true });
  });

  it('vẫn cho phép sau 4 lần sai, chặn từ lần sai thứ 5', () => {
    const gh = taoGioiHanDangNhap();
    for (let i = 0; i < 4; i++) gh.ghiThatBai('lan|1.2.3.4', T0);
    expect(gh.kiemTra('lan|1.2.3.4', T0).duocPhep).toBe(true);

    gh.ghiThatBai('lan|1.2.3.4', T0);

    expect(gh.kiemTra('lan|1.2.3.4', T0).duocPhep).toBe(false);
  });

  it('báo số giây phải chờ tính từ lần sai sớm nhất còn trong cửa sổ', () => {
    const gh = taoGioiHanDangNhap();
    for (let i = 0; i < 5; i++) gh.ghiThatBai('k', T0);

    expect(gh.kiemTra('k', T0 + 5 * PHUT)).toEqual({ duocPhep: false, thuLaiSauGiay: 10 * 60 });
  });

  it('hết 15 phút thì cho thử lại', () => {
    const gh = taoGioiHanDangNhap();
    for (let i = 0; i < 5; i++) gh.ghiThatBai('k', T0);

    expect(gh.kiemTra('k', T0 + 15 * PHUT).duocPhep).toBe(true);
  });

  it('khoá khác nhau không ảnh hưởng nhau', () => {
    const gh = taoGioiHanDangNhap();
    for (let i = 0; i < 5; i++) gh.ghiThatBai('lan|1.1.1.1', T0);

    expect(gh.kiemTra('lan|2.2.2.2', T0).duocPhep).toBe(true);
    expect(gh.kiemTra('minh|1.1.1.1', T0).duocPhep).toBe(true);
  });

  it('đăng nhập thành công (xoa) đặt lại bộ đếm', () => {
    const gh = taoGioiHanDangNhap();
    for (let i = 0; i < 4; i++) gh.ghiThatBai('k', T0);

    gh.xoa('k');
    gh.ghiThatBai('k', T0);

    expect(gh.kiemTra('k', T0).duocPhep).toBe(true);
  });

  it('tuỳ chọn toiDa và cuaSoMs được tôn trọng', () => {
    const gh = taoGioiHanDangNhap({ toiDa: 2, cuaSoMs: PHUT });
    gh.ghiThatBai('k', T0);
    gh.ghiThatBai('k', T0);

    expect(gh.kiemTra('k', T0).duocPhep).toBe(false);
    expect(gh.kiemTra('k', T0 + PHUT).duocPhep).toBe(true);
  });
});
