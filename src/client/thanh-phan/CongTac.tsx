import type { ButtonHTMLAttributes } from 'react';
import './CongTac.css';

interface CongTacProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'role'> {
  bat: boolean;
  onDoi: (batMoi: boolean) => void;
  nhan?: string;
}

/**
 * Công tắc bật/tắt (T-010c). `<button role="switch">` thay vì checkbox ẩn —
 * bấm được bằng chuột/chạm VÀ Space/Enter qua hành vi mặc định của `<button>`,
 * không cần code bàn phím riêng. Vùng chạm/vòng focus lấy từ luật chung
 * `tokens.css` cho mọi `<button>` (44×44, focus-visible).
 */
export function CongTac({ bat, onDoi, nhan, disabled, className, ...rest }: CongTacProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={bat}
      aria-label={nhan}
      disabled={disabled}
      className={['cong-tac', bat ? 'cong-tac--bat' : '', className].filter(Boolean).join(' ')}
      onClick={() => onDoi(!bat)}
      {...rest}
    >
      <span className="cong-tac__nut" />
    </button>
  );
}
