import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CongTac } from './CongTac';

describe('CongTac', () => {
  it('bat=false: role="switch", aria-checked="false", không có lớp --bat', () => {
    const html = renderToStaticMarkup(<CongTac bat={false} onDoi={() => {}} nhan="Quản lý theo lô" />);

    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    expect(html).not.toContain('cong-tac--bat');
  });

  it('bat=true: aria-checked="true", có lớp --bat', () => {
    const html = renderToStaticMarkup(<CongTac bat={true} onDoi={() => {}} nhan="Quản lý theo lô" />);

    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('cong-tac--bat');
  });

  it('là <button> thật (không phải div/span) — Enter/Space bấm được qua hành vi mặc định của trình duyệt, không cần code bàn phím riêng', () => {
    const html = renderToStaticMarkup(<CongTac bat={false} onDoi={() => {}} />);
    expect(html.startsWith('<button')).toBe(true);
  });

  it('disabled truyền xuống thẻ button gốc', () => {
    const html = renderToStaticMarkup(<CongTac bat={false} onDoi={() => {}} disabled />);
    expect(html).toContain('disabled=""');
  });

  it('nhan trở thành aria-label cho người dùng đọc màn hình', () => {
    const html = renderToStaticMarkup(<CongTac bat={false} onDoi={() => {}} nhan="Quản lý theo lô" />);
    expect(html).toContain('aria-label="Quản lý theo lô"');
  });
});
