import { DanhSachHangHoa } from './man-hinh/HangHoa/DanhSachHangHoa';

// "Quầy thuốc" là tên ứng dụng, không phải tên màn hình — giữ lại làm tiêu đề
// trang trong lúc chưa có thanh điều hướng tổng thể (Tổng quan/Bán hàng/... của
// KiotViet chưa tồn tại ở v1 hiện tại; T-020 sẽ là màn tiếp theo được dựng).
export function App() {
  return (
    <main>
      <h1>Quầy thuốc</h1>
      <DanhSachHangHoa />
    </main>
  );
}
