import { useState } from 'react';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { Nut } from '../thanh-phan';
import { type Man, cacManChoPhep, nhanVaiTro } from './vai-tro';

const NHAN_MAN: Record<Man, string> = {
  'ban-hang': 'Bán hàng',
  'hang-hoa': 'Hàng hoá',
  'nhap-hang': 'Nhập hàng',
  'tra-hang': 'Trả hàng',
  'tra-hang-nhap': 'Trả hàng nhập',
  'tong-quan': 'Tổng quan',
  'cai-dat': 'Cài đặt',
};

interface Props {
  nguoi: NguoiDungHienTai;
  man: Man;
  onChonMan: (man: Man) => void;
  onDangXuat: () => void;
}

/** Thanh menu trên cùng: chỉ hiện những màn vai trò được dùng, kèm người dùng và Đăng xuất. */
export function DieuHuong({ nguoi, man, onChonMan, onDangXuat }: Props) {
  // Chỉ có tác dụng trên điện thoại: CSS ẩn danh sách mục cho tới khi mở; từ 768px trở
  // lên danh sách luôn hiện như cũ và nút Menu bị ẩn.
  const [dangMo, setDangMo] = useState(false);

  return (
    <nav className="app__dieu-huong" aria-label="Chuyển màn hình">
      <h1 className="app__tieu-de">Quầy thuốc</h1>
      <span className="app__man-hien-tai">{NHAN_MAN[man]}</span>
      <button
        type="button"
        className="app__nut-menu"
        aria-label="Menu"
        aria-expanded={dangMo}
        aria-controls="menu-chinh"
        onClick={() => setDangMo((mo) => !mo)}
      >
        ☰
      </button>
      <div id="menu-chinh" className={dangMo ? 'app__muc app__muc--mo' : 'app__muc'}>
        {cacManChoPhep(nguoi.vaiTro).map((m) => (
          <Nut
            key={m}
            bienThe={m === man ? 'chinh' : 'phu'}
            onClick={() => {
              setDangMo(false);
              onChonMan(m);
            }}
          >
            {NHAN_MAN[m]}
          </Nut>
        ))}
        <span className="app__nguoi-dung">
          {nguoi.tenHienThi} · {nhanVaiTro(nguoi.vaiTro)}
        </span>
        <Nut bienThe="phu" onClick={onDangXuat}>
          Đăng xuất
        </Nut>
      </div>
    </nav>
  );
}
