import { useState } from 'react';
import { BanHang } from './man-hinh/BanHang/BanHang';
import { CaiDat } from './man-hinh/CaiDat/CaiDat';
import { DanhSachHangHoa } from './man-hinh/HangHoa/DanhSachHangHoa';
import { DanhSachPhieuNhap } from './man-hinh/NhapHang/DanhSachPhieuNhap';
import { DanhSachTraHang } from './man-hinh/TraHang/DanhSachTraHang';
import { DanhSachTraHangNhap } from './man-hinh/TraHangNhap/DanhSachTraHangNhap';
import { TongQuan } from './man-hinh/TongQuan/TongQuan';
import type { NguoiDungHienTai } from '../shared/hop-dong/auth';
import { DieuHuong } from './xac-thuc/DieuHuong';
import { ManDangNhap } from './xac-thuc/ManDangNhap';
import { useXacThuc } from './xac-thuc/use-xac-thuc';
import { type Man, cacManChoPhep, manMacDinh } from './xac-thuc/vai-tro';
import './App.css';

// Bộ chuyển màn tối thiểu — KHÔNG bám sidebar đầy đủ của KiotViet (chưa có task
// dựng nav thật trong BACKLOG.md). Chỉ để "Hàng hoá" (T-009) không biến mất khỏi
// giao diện từ khi T-020 thêm màn thứ hai; mặc định "Bán hàng" vì đó là việc
// dược sĩ làm cả ngày. "Nhập hàng" vào thẳng DANH SÁCH (T-041, khớp KiotViet:
// nav vào danh sách, nút "+ Nhập hàng" mới mở luồng tạo tay T-040c1/T-043).
// "Trả hàng nhập" (T-053c1) vào thẳng danh sách. T-053c2 — nút "Trả hàng
// nhập" ở chân chi tiết một phiếu nhập (trong "Nhập hàng") nhảy sang đây,
// kèm mã phiếu nhập đó để tự mở sẵn luồng tạo — "man"/"maPhieuNhapTraHangNhap"
// là state tối thiểu duy nhất cần NÂNG LÊN App (không dùng router) để hai màn
// độc lập này nói chuyện được với nhau.
export function App() {
  const { trangThai, dangNhapXong, dangXuat } = useXacThuc();

  if (trangThai.loai === 'DANG_TAI') {
    return (
      <main className="app__dang-tai" role="status">
        Đang tải…
      </main>
    );
  }
  if (trangThai.loai === 'CHUA_DANG_NHAP') {
    return <ManDangNhap onDangNhapThanhCong={dangNhapXong} {...(trangThai.ghiChu ? { ghiChu: trangThai.ghiChu } : {})} />;
  }
  // `key` theo người dùng: đổi người (đăng xuất rồi đăng nhập người khác) dựng lại
  // toàn bộ state màn hình, không để sót giỏ hàng/màn đang mở của người trước.
  return <UngDung key={trangThai.nguoi.id} nguoi={trangThai.nguoi} onDangXuat={() => void dangXuat()} />;
}

function UngDung({ nguoi, onDangXuat }: { nguoi: NguoiDungHienTai; onDangXuat: () => void }) {
  const [manChon, setMan] = useState<Man>(manMacDinh);
  const [maPhieuNhapTraHangNhap, setMaPhieuNhapTraHangNhap] = useState<string | undefined>(undefined);
  // Menu đã lọc theo vai trò, nhưng state vẫn có thể giữ màn không được phép (vd. giao
  // diện cũ còn trong bộ nhớ) — luôn rơi về màn mặc định thay vì vẽ màn không có quyền.
  const man: Man = cacManChoPhep(nguoi.vaiTro).includes(manChon) ? manChon : manMacDinh;

  function traHangNhapTuPhieuNhap(ma: string) {
    setMaPhieuNhapTraHangNhap(ma);
    setMan('tra-hang-nhap');
  }

  return (
    <main>
      <DieuHuong nguoi={nguoi} man={man} onChonMan={setMan} onDangXuat={onDangXuat} />
      {man === 'ban-hang' ? (
        <BanHang nguoiId={nguoi.id} />
      ) : man === 'hang-hoa' ? (
        <DanhSachHangHoa />
      ) : man === 'nhap-hang' ? (
        <DanhSachPhieuNhap onTraHangNhap={traHangNhapTuPhieuNhap} />
      ) : man === 'tra-hang' ? (
        <DanhSachTraHang />
      ) : man === 'tra-hang-nhap' ? (
        <DanhSachTraHangNhap
          maPhieuNhapGoiY={maPhieuNhapTraHangNhap}
          onDaDungMaGoiY={() => setMaPhieuNhapTraHangNhap(undefined)}
        />
      ) : man === 'tong-quan' ? (
        <TongQuan />
      ) : (
        <CaiDat nguoiHienTaiId={nguoi.id} />
      )}
    </main>
  );
}
