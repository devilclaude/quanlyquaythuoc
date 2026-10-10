import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ManDangNhap, thongBaoDangNhap } from './ManDangNhap';

describe('thongBaoDangNhap', () => {
  it('SAI → câu sai tên hoặc mật khẩu', () => {
    expect(thongBaoDangNhap({ loai: 'SAI' })).toBe('Sai tên đăng nhập hoặc mật khẩu');
  });

  it('BI_CHAN → báo số phút làm tròn lên', () => {
    expect(thongBaoDangNhap({ loai: 'BI_CHAN', thuLaiSauGiay: 600 })).toBe(
      'Đăng nhập sai quá nhiều lần. Thử lại sau 10 phút',
    );
    expect(thongBaoDangNhap({ loai: 'BI_CHAN', thuLaiSauGiay: 61 })).toBe(
      'Đăng nhập sai quá nhiều lần. Thử lại sau 2 phút',
    );
    expect(thongBaoDangNhap({ loai: 'BI_CHAN', thuLaiSauGiay: 5 })).toBe(
      'Đăng nhập sai quá nhiều lần. Thử lại sau 1 phút',
    );
  });

  it('LOI_MANG → báo không kết nối được máy chủ', () => {
    expect(thongBaoDangNhap({ loai: 'LOI_MANG' })).toBe('Không kết nối được máy chủ');
  });
});

describe('ManDangNhap', () => {
  it('có tiêu đề app, tiêu đề Đăng nhập, hai ô nhập và nút gửi', () => {
    const html = renderToStaticMarkup(<ManDangNhap onDangNhapThanhCong={() => undefined} />);

    expect(html).toMatch(/<h1[^>]*>Quầy thuốc<\/h1>/);
    expect(html).toContain('Đăng nhập');
    expect(html).toContain('Tên đăng nhập');
    expect(html).toContain('Mật khẩu');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Đăng nhập<\/button>/);
  });

  it('ô mật khẩu che ký tự, ô tên gợi ý trình quản lý mật khẩu', () => {
    const html = renderToStaticMarkup(<ManDangNhap onDangNhapThanhCong={() => undefined} />);

    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
  });

  it('ghi chú ban đầu (vd. hết phiên) hiện trong vùng cảnh báo', () => {
    const html = renderToStaticMarkup(
      <ManDangNhap onDangNhapThanhCong={() => undefined} ghiChu="Phiên đã hết hạn, vui lòng đăng nhập lại" />,
    );

    expect(html).toMatch(/role="alert"[^>]*>[^<]*Phiên đã hết hạn, vui lòng đăng nhập lại/);
  });

  it('không có ghi chú thì không vẽ vùng cảnh báo và không lộ chữ undefined', () => {
    const html = renderToStaticMarkup(<ManDangNhap onDangNhapThanhCong={() => undefined} />);

    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('undefined');
  });
});
