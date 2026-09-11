import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TruongNhap } from './TruongNhap';

describe('TruongNhap', () => {
  it('kieu="so" bật inputMode numeric để không hiện spinner/dấu thập phân locale', () => {
    const html = renderToStaticMarkup(<TruongNhap kieu="so" />);
    expect(html).toContain('inputMode="numeric"');
    expect(html).not.toContain('type="number"');
  });

  it('mặc định (kieu="chu") không gắn inputMode numeric', () => {
    const html = renderToStaticMarkup(<TruongNhap />);
    expect(html).not.toContain('inputMode');
  });

  it('nhãn được nối với ô nhập qua id/htmlFor', () => {
    const html = renderToStaticMarkup(<TruongNhap nhan="Số lượng" id="so-luong" />);
    expect(html).toContain('for="so-luong"');
    expect(html).toContain('id="so-luong"');
  });

  it('thông báo lỗi nối với ô nhập qua aria-describedby và bật aria-invalid', () => {
    const html = renderToStaticMarkup(<TruongNhap id="ten" loi="Bắt buộc nhập" />);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="ten-loi"');
    expect(html).toContain('id="ten-loi"');
    expect(html).toContain('Bắt buộc nhập');
  });

  it('không có lỗi thì không set aria-invalid/aria-describedby', () => {
    const html = renderToStaticMarkup(<TruongNhap id="ten" />);
    expect(html).not.toContain('aria-invalid');
    expect(html).not.toContain('aria-describedby');
  });
});
