import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChiBaoTrangThai } from './ChiBaoTrangThai';

// Tương tác online/offline thật (sự kiện trình duyệt) chỉ kiểm được ở tầng e2e
// (tests/e2e/ban-hang.spec.ts) — `renderToStaticMarkup` không chạy effect, ở đây
// chỉ xác nhận lần render tĩnh đầu tiên (không có `navigator` → mặc định online)
// ra đúng nội dung theo `tinhNoiDungChiBao`.
describe('ChiBaoTrangThai', () => {
  it('render tĩnh đầu tiên hiện đúng badge online và chưa đồng bộ lần nào', () => {
    const html = renderToStaticMarkup(<ChiBaoTrangThai />);
    expect(html).toContain('Đang online');
    expect(html).toContain('badge--tot');
    expect(html).toContain('Chưa đồng bộ lần nào');
  });

  it('không hiện badge "chờ đồng bộ" khi không có gì chờ', () => {
    const html = renderToStaticMarkup(<ChiBaoTrangThai />);
    expect(html).not.toContain('thao tác chờ đồng bộ');
  });

  it('luôn hiện, có role status để trình đọc màn hình báo khi đổi (aria-live)', () => {
    const html = renderToStaticMarkup(<ChiBaoTrangThai />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});
