import type { NguoiDungHienTai, VaiTro } from '../../shared/hop-dong/auth';
import { Nut } from '../thanh-phan';
import { type Man, cacManChoPhep } from './vai-tro';

const NHAN_MAN: Record<Man, string> = {
  'ban-hang': 'Bán hàng',
  'hang-hoa': 'Hàng hoá',
  'nhap-hang': 'Nhập hàng',
  'tra-hang': 'Trả hàng',
  'tra-hang-nhap': 'Trả hàng nhập',
  'tong-quan': 'Tổng quan',
  'cai-dat': 'Cài đặt',
};

export function nhanVaiTro(vaiTro: VaiTro): string {
  return vaiTro === 'ADMIN' ? 'Quản trị' : 'Nhân viên';
}

interface Props {
  nguoi: NguoiDungHienTai;
  man: Man;
  onChonMan: (man: Man) => void;
  onDangXuat: () => void;
}

/** Thanh menu trên cùng: chỉ hiện những màn vai trò được dùng, kèm người dùng và Đăng xuất. */
export function DieuHuong({ nguoi, man, onChonMan, onDangXuat }: Props) {
  return (
    <nav className="app__dieu-huong" aria-label="Chuyển màn hình">
      <h1 className="app__tieu-de">Quầy thuốc</h1>
      {cacManChoPhep(nguoi.vaiTro).map((m) => (
        <Nut key={m} bienThe={m === man ? 'chinh' : 'phu'} onClick={() => onChonMan(m)}>
          {NHAN_MAN[m]}
        </Nut>
      ))}
      <span className="app__nguoi-dung">
        {nguoi.tenHienThi} · {nhanVaiTro(nguoi.vaiTro)}
      </span>
      <Nut bienThe="phu" onClick={onDangXuat}>
        Đăng xuất
      </Nut>
    </nav>
  );
}
