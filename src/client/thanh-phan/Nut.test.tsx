import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Nut } from './Nut';

describe('Nut', () => {
  it('mặc định biến thể chính, type=button để không lỡ submit form khi đặt trong form', () => {
    const html = renderToStaticMarkup(<Nut>Lưu</Nut>);
    expect(html).toContain('nut--chinh');
    expect(html).toContain('type="button"');
  });

  it('nhận biến thể phụ và nguy', () => {
    expect(renderToStaticMarkup(<Nut bienThe="phu">Huỷ</Nut>)).toContain('nut--phu');
    expect(renderToStaticMarkup(<Nut bienThe="nguy">Xoá</Nut>)).toContain('nut--nguy');
  });

  it('giữ được type do người dùng khai báo (vd submit trong form)', () => {
    const html = renderToStaticMarkup(<Nut type="submit">Gửi</Nut>);
    expect(html).toContain('type="submit"');
  });

  it('gộp className truyền vào thay vì ghi đè', () => {
    const html = renderToStaticMarkup(<Nut className="them-lop">Lưu</Nut>);
    expect(html).toContain('nut nut--chinh them-lop');
  });

  it('truyền disabled xuống thẻ button gốc', () => {
    const html = renderToStaticMarkup(<Nut disabled>Lưu</Nut>);
    expect(html).toContain('disabled=""');
  });
});
