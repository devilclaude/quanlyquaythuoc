import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KhoiCaiDatToanCuc } from './CaiDat';

describe('KhoiCaiDatToanCuc', () => {
  it('bat=false: công tắc tắt (aria-checked="false"), không hiện lỗi', () => {
    const html = renderToStaticMarkup(
      <KhoiCaiDatToanCuc trangThai={{ bat: false, dangDoi: false, loi: undefined }} onDoi={() => {}} />,
    );

    expect(html).toContain('Quản lý theo lô');
    expect(html).toContain('aria-checked="false"');
    expect(html).not.toContain('cai-dat__loi');
  });

  it('bat=true: công tắc bật (aria-checked="true")', () => {
    const html = renderToStaticMarkup(
      <KhoiCaiDatToanCuc trangThai={{ bat: true, dangDoi: false, loi: undefined }} onDoi={() => {}} />,
    );

    expect(html).toContain('aria-checked="true"');
  });

  it('dangDoi=true: công tắc bị disabled, chặn bấm lại trong lúc chờ phản hồi', () => {
    const html = renderToStaticMarkup(
      <KhoiCaiDatToanCuc trangThai={{ bat: false, dangDoi: true, loi: undefined }} onDoi={() => {}} />,
    );

    expect(html).toContain('disabled=""');
  });

  it('loi có giá trị: hiện thông báo lỗi rõ ràng (vd. 409 khi bị chặn tắt vì còn nhiều lô tồn)', () => {
    const html = renderToStaticMarkup(
      <KhoiCaiDatToanCuc
        trangThai={{ bat: true, dangDoi: false, loi: 'Không thể tắt quản lý theo lô cho sản phẩm sp-1' }}
        onDoi={() => {}}
      />,
    );

    expect(html).toContain('Không thể tắt quản lý theo lô cho sản phẩm sp-1');
  });
});
