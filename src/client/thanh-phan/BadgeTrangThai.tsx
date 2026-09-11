import type { HTMLAttributes } from 'react';
import './BadgeTrangThai.css';

type MauBadge = 'tot' | 'nguy' | 'canh-bao' | 'trung-tinh';

interface BadgeTrangThaiProps extends HTMLAttributes<HTMLSpanElement> {
  mau: MauBadge;
}

/**
 * Badge trạng thái dùng ba màu ý nghĩa đã chốt trong design-system: xanh lá =
 * tốt (còn hàng, đã đồng bộ), đỏ = nguy (hết hàng, tồn âm, hết hạn), hổ phách =
 * cảnh báo (cận date, chờ đồng bộ). `trung-tinh` cho các trạng thái còn lại.
 */
export function BadgeTrangThai({ mau, className, ...rest }: BadgeTrangThaiProps) {
  const lop = ['badge', `badge--${mau}`, className].filter(Boolean).join(' ');
  return <span className={lop} {...rest} />;
}
