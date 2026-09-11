import type { ButtonHTMLAttributes } from 'react';
import './Nut.css';

type BienTheNut = 'chinh' | 'phu' | 'nguy';

interface NutProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  bienThe?: BienTheNut;
}

export function Nut({ bienThe = 'chinh', type = 'button', className, ...rest }: NutProps) {
  const lop = ['nut', `nut--${bienThe}`, className].filter(Boolean).join(' ');
  return <button type={type} className={lop} {...rest} />;
}
