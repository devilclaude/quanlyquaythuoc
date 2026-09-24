import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import './Nut.css';

type BienTheNut = 'chinh' | 'phu' | 'nguy';

interface NutProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  bienThe?: BienTheNut;
}

/** `forwardRef` để màn cần focus lập trình được nút (vd. focus sẵn nút "In"
 * khi mở preview in hoá đơn — T-023), cùng lý do `TruongNhap` đã đổi ở T-020. */
export const Nut = forwardRef<HTMLButtonElement, NutProps>(function Nut(
  { bienThe = 'chinh', type = 'button', className, ...rest },
  ref,
) {
  const lop = ['nut', `nut--${bienThe}`, className].filter(Boolean).join(' ');
  return <button ref={ref} type={type} className={lop} {...rest} />;
});
