import { useState } from 'react';
import { BanHang } from './man-hinh/BanHang/BanHang';
import { CaiDat } from './man-hinh/CaiDat/CaiDat';
import { DanhSachHangHoa } from './man-hinh/HangHoa/DanhSachHangHoa';
import { Nut } from './thanh-phan';
import './App.css';

type Man = 'ban-hang' | 'hang-hoa' | 'cai-dat';

// Bộ chuyển màn tối thiểu — KHÔNG bám sidebar đầy đủ của KiotViet (chưa có task
// dựng nav thật trong BACKLOG.md). Chỉ để "Hàng hoá" (T-009) không biến mất khỏi
// giao diện từ khi T-020 thêm màn thứ hai; mặc định "Bán hàng" vì đó là việc
// dược sĩ làm cả ngày.
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
        <Nut bienThe={man === 'cai-dat' ? 'chinh' : 'phu'} onClick={() => setMan('cai-dat')}>
          Cài đặt
        </Nut>
      </nav>
      {man === 'ban-hang' ? <BanHang /> : man === 'hang-hoa' ? <DanhSachHangHoa /> : <CaiDat />}
    </main>
  );
}
