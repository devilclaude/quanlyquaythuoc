import { BadgeTrangThai } from '../thanh-phan';
import { tinhNoiDungChiBao } from './chi-bao-trang-thai';
import { useTrangThaiKetNoi } from './use-trang-thai-ket-noi';
import './ChiBaoTrangThai.css';

/**
 * Chỉ báo online/offline — luôn hiển thị trên màn bán hàng, không giấu trong
 * menu (SPEC.md §5.5, UI-FIDELITY.md). `role="status"`/`aria-live="polite"` để
 * đổi trạng thái được trình đọc màn hình báo mà không cần focus vào đây.
 */
export function ChiBaoTrangThai() {
  const trangThai = useTrangThaiKetNoi();
  const noiDung = tinhNoiDungChiBao(trangThai);

  return (
    <div className="chi-bao-trang-thai" role="status" aria-live="polite">
      <BadgeTrangThai mau={noiDung.mauKetNoi}>{noiDung.nhanKetNoi}</BadgeTrangThai>
      {noiDung.nhanCho ? <BadgeTrangThai mau="canh-bao">{noiDung.nhanCho}</BadgeTrangThai> : null}
      <span className="chi-bao-trang-thai__dong-bo">{noiDung.nhanDongBo}</span>
    </div>
  );
}
