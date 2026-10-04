import { useState } from 'react';
import { BanHang } from './man-hinh/BanHang/BanHang';
import { CaiDat } from './man-hinh/CaiDat/CaiDat';
import { DanhSachHangHoa } from './man-hinh/HangHoa/DanhSachHangHoa';
import { DanhSachPhieuNhap } from './man-hinh/NhapHang/DanhSachPhieuNhap';
import { DanhSachTraHang } from './man-hinh/TraHang/DanhSachTraHang';
import { DanhSachTraHangNhap } from './man-hinh/TraHangNhap/DanhSachTraHangNhap';
import { TongQuan } from './man-hinh/TongQuan/TongQuan';
import { Nut } from './thanh-phan';
import './App.css';

type Man = 'ban-hang' | 'hang-hoa' | 'nhap-hang' | 'tra-hang' | 'tra-hang-nhap' | 'tong-quan' | 'cai-dat';

// Bộ chuyển màn tối thiểu — KHÔNG bám sidebar đầy đủ của KiotViet (chưa có task
// dựng nav thật trong BACKLOG.md). Chỉ để "Hàng hoá" (T-009) không biến mất khỏi
// giao diện từ khi T-020 thêm màn thứ hai; mặc định "Bán hàng" vì đó là việc
// dược sĩ làm cả ngày. "Nhập hàng" vào thẳng DANH SÁCH (T-041, khớp KiotViet:
// nav vào danh sách, nút "+ Nhập hàng" mới mở luồng tạo tay T-040c1/T-043).
// "Trả hàng nhập" (T-053c1) vào thẳng danh sách, chỉ đọc — nút "+ Trả hàng
// nhập" (luồng tạo) và liên kết ngược từ chi tiết phiếu nhập thuộc T-053c2.
export function App() {
  const [man, setMan] = useState<Man>('ban-hang');

  return (
    <main>
      <nav className="app__dieu-huong" aria-label="Chuyển màn hình">
        <h1 className="app__tieu-de">Quầy thuốc</h1>
        <Nut bienThe={man === 'ban-hang' ? 'chinh' : 'phu'} onClick={() => setMan('ban-hang')}>
          Bán hàng
        </Nut>
        <Nut bienThe={man === 'hang-hoa' ? 'chinh' : 'phu'} onClick={() => setMan('hang-hoa')}>
          Hàng hoá
        </Nut>
        <Nut bienThe={man === 'nhap-hang' ? 'chinh' : 'phu'} onClick={() => setMan('nhap-hang')}>
          Nhập hàng
        </Nut>
        <Nut bienThe={man === 'tra-hang' ? 'chinh' : 'phu'} onClick={() => setMan('tra-hang')}>
          Trả hàng
        </Nut>
        <Nut bienThe={man === 'tra-hang-nhap' ? 'chinh' : 'phu'} onClick={() => setMan('tra-hang-nhap')}>
          Trả hàng nhập
        </Nut>
        <Nut bienThe={man === 'tong-quan' ? 'chinh' : 'phu'} onClick={() => setMan('tong-quan')}>
          Tổng quan
        </Nut>
        <Nut bienThe={man === 'cai-dat' ? 'chinh' : 'phu'} onClick={() => setMan('cai-dat')}>
          Cài đặt
        </Nut>
      </nav>
      {man === 'ban-hang' ? (
        <BanHang />
      ) : man === 'hang-hoa' ? (
        <DanhSachHangHoa />
      ) : man === 'nhap-hang' ? (
        <DanhSachPhieuNhap />
      ) : man === 'tra-hang' ? (
        <DanhSachTraHang />
      ) : man === 'tra-hang-nhap' ? (
        <DanhSachTraHangNhap />
      ) : man === 'tong-quan' ? (
        <TongQuan />
      ) : (
        <CaiDat />
      )}
    </main>
  );
}
