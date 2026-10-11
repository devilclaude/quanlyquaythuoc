import type { TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import './Bang.css';

export function Bang({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="bang__boc">
      <table className={['bang', className].filter(Boolean).join(' ')} {...rest} />
    </div>
  );
}

/** Ô số trong bảng — dùng lớp `so` toàn cục ở tokens.css để căn phải + tabular-nums
 * cho tiền, số lượng, tồn kho. */
export function OSo({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={['so', className].filter(Boolean).join(' ')} {...rest} />;
}

/**
 * Tiêu đề cột số — căn phải cùng lớp `so` với ô số (`OSo`) bên dưới để chữ tiêu đề
 * thẳng với đuôi con số. Không có nó, tiêu đề (mặc định căn trái) lệch hẳn so với số
 * căn phải. Dùng cho MỌI cột mà ô là `OSo`.
 */
export function TieuDeSo({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={['so', className].filter(Boolean).join(' ')} {...rest} />;
}
