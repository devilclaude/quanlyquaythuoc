import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import './TruongNhap.css';

type KieuTruongNhap = 'chu' | 'so';

interface TruongNhapProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  nhan?: string;
  loi?: string;
  kieu?: KieuTruongNhap;
}

/**
 * Ô nhập cơ bản. `kieu="so"` dùng `inputMode="numeric"` thay vì `type="number"`
 * để tránh spinner và dấu thập phân theo locale trình duyệt — số lượng và tiền
 * trong SPEC.md đều là số nguyên nhập bằng tay hoặc bàn phím số.
 * tokens.css đã tự căn phải + tabular-nums cho input có inputMode="numeric".
 *
 * `forwardRef` để màn cần focus lập trình được ô nhập (vd. màn bán hàng lấy
 * lại focus ô tìm sau khi thêm hàng, hoặc khi bấm F3 — T-020).
 */
export const TruongNhap = forwardRef<HTMLInputElement, TruongNhapProps>(function TruongNhap(
  { nhan, loi, kieu = 'chu', id, className, ...rest },
  ref,
) {
  const idTuSinh = useId();
  const idThat = id ?? idTuSinh;
  const idLoi = loi ? `${idThat}-loi` : undefined;

  return (
    <div className="truong-nhap">
      {nhan ? (
        <label htmlFor={idThat} className="truong-nhap__nhan">
          {nhan}
        </label>
      ) : null}
      <input
        ref={ref}
        id={idThat}
        type="text"
        inputMode={kieu === 'so' ? 'numeric' : undefined}
        pattern={kieu === 'so' ? '[0-9]*' : undefined}
        aria-invalid={loi ? true : undefined}
        aria-describedby={idLoi}
        className={['truong-nhap__o', loi ? 'truong-nhap__o--loi' : '', className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {loi ? (
        <p id={idLoi} className="truong-nhap__loi">
          {loi}
        </p>
      ) : null}
    </div>
  );
});
