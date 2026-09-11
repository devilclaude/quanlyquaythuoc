import type { TableHTMLAttributes, TdHTMLAttributes } from 'react';
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
