import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Bang, OSo } from './Bang';

describe('Bang', () => {
  it('bọc table trong khung cuộn ngang để không vỡ layout ở màn hẹp', () => {
    const html = renderToStaticMarkup(
      <Bang>
        <tbody>
          <tr>
            <td>Paracetamol</td>
          </tr>
        </tbody>
      </Bang>,
    );
    expect(html).toContain('bang__boc');
    expect(html).toContain('<table class="bang">');
  });

  it('gộp className truyền vào cho table', () => {
    const html = renderToStaticMarkup(
      <Bang className="them-lop">
        <tbody />
      </Bang>,
    );
    expect(html).toContain('class="bang them-lop"');
  });
});

describe('OSo', () => {
  it('gắn lớp "so" để căn phải + tabular-nums theo luật chung ở tokens.css', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <tr>
            <OSo>864</OSo>
          </tr>
        </tbody>
      </table>,
    );
    expect(html).toContain('<td class="so">864</td>');
  });
});
