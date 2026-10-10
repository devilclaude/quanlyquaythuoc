import { useState } from 'react';
import type { FormEvent } from 'react';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { Nut, TruongNhap } from '../thanh-phan';
import { type KetQuaDangNhap, dangNhap } from './phien-client';
import './ManDangNhap.css';

type KetQuaLoi = Exclude<KetQuaDangNhap, { loai: 'OK' }>;

export function thongBaoDangNhap(ketQua: KetQuaLoi): string {
  if (ketQua.loai === 'SAI') return 'Sai tên đăng nhập hoặc mật khẩu';
  if (ketQua.loai === 'BI_CHAN') {
    return `Đăng nhập sai quá nhiều lần. Thử lại sau ${Math.max(1, Math.ceil(ketQua.thuLaiSauGiay / 60))} phút`;
  }
  return 'Không kết nối được máy chủ';
}

interface Props {
  onDangNhapThanhCong: (nguoi: NguoiDungHienTai) => void;
  /** Câu báo sẵn lúc mở màn, vd. "Phiên đã hết hạn…". */
  ghiChu?: string;
}

export function ManDangNhap({ onDangNhapThanhCong, ghiChu }: Props) {
  const [ten, setTen] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const thongBao = loi ?? ghiChu;

  async function gui(e: FormEvent) {
    e.preventDefault();
    if (dangGui) return;
    setDangGui(true);
    setLoi(undefined);
    const ketQua = await dangNhap(ten, matKhau);
    setDangGui(false);
    if (ketQua.loai === 'OK') {
      setMatKhau('');
      onDangNhapThanhCong(ketQua.nguoi);
      return;
    }
    setLoi(thongBaoDangNhap(ketQua));
  }

  return (
    <main className="man-dang-nhap">
      <form className="man-dang-nhap__the" onSubmit={(e) => void gui(e)}>
        <h1 className="man-dang-nhap__ten-app">Quầy thuốc</h1>
        <h2 className="man-dang-nhap__tieu-de">Đăng nhập</h2>
        {thongBao ? (
          <p className="man-dang-nhap__loi" role="alert">
            {thongBao}
          </p>
        ) : null}
        <TruongNhap
          nhan="Tên đăng nhập"
          value={ten}
          onChange={(e) => setTen(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
        <TruongNhap
          nhan="Mật khẩu"
          kieu="mat-khau"
          value={matKhau}
          onChange={(e) => setMatKhau(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Nut type="submit" disabled={dangGui}>
          {dangGui ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Nut>
      </form>
    </main>
  );
}
