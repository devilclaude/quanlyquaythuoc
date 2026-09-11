import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BadgeTrangThai } from './BadgeTrangThai';

describe('BadgeTrangThai', () => {
  it.each([
    ['tot', 'badge--tot'],
    ['nguy', 'badge--nguy'],
    ['canh-bao', 'badge--canh-bao'],
    ['trung-tinh', 'badge--trung-tinh'],
  ] as const)('mau="%s" ra đúng lớp %s', (mau, lopMongDoi) => {
    const html = renderToStaticMarkup(<BadgeTrangThai mau={mau}>Còn hàng</BadgeTrangThai>);
    expect(html).toContain(lopMongDoi);
  });

  it('hiện đúng nội dung con', () => {
    const html = renderToStaticMarkup(<BadgeTrangThai mau="nguy">Hết hàng</BadgeTrangThai>);
    expect(html).toContain('Hết hàng');
  });
});
