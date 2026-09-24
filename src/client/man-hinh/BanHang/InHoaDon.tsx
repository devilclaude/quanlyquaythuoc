import { useEffect, useRef } from 'react';
import type { HoaDonRes, PhuongThucThanhToan } from '../../../shared/hop-dong/hoa-don';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangThoiGianVN } from '../../../shared/thoi-gian/dinh-dang';
import { dinhDangSo, dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Nut } from '../../thanh-phan';
import { CAC_PHUONG_THUC } from './ThanhToan';
import './InHoaDon.css';

// T-023 — In hoá đơn. KHÔNG có ảnh "hoá đơn KiotViet" nào trong
// docs/reference/kiotviet/ (chỉ có ảnh tem mã/nhập hàng) để đối chiếu nội
// dung — đã tìm kỹ (xem JOURNAL.md entry T-023). Theo tiền lệ T-010c (màn cài
// đặt cũng không có ảnh tham chiếu): dựng theo token design-system + khuôn
// hoá đơn bán lẻ phổ thông (mã, giờ, dòng hàng, tổng, phương thức, tiền thừa),
// không phải suy đoán riêng của KiotViet — rủi ro thấp hơn hẳn T-054/T-060 vì
// đây chỉ là trình bày lại dữ liệu ĐÃ ĐÚNG (hoa_don/hoa_don_dong), không phải
// một quyết định kiến trúc hay dữ liệu tồn kho thật. Modal dùng lại đúng khuôn
// `role="dialog"` của `TaoMoiHangHoa.tsx` (overlay + Esc đóng), không phát
// minh mẫu mới.

export type KhoGiayIn = 'K57' | 'K80';

const CHIEU_RONG_MM: Record<KhoGiayIn, number> = { K57: 57, K80: 80 };

const KHO_GIAY_LUU_KEY = 'quaythuoc.khoGiayIn';

/** Đọc khổ giấy đã chọn lần in gần nhất trên máy này — mặc định K80 khi chưa
 * từng chọn hoặc localStorage không đọc được (chế độ ẩn danh). */
export function docKhoGiayDaLuu(): KhoGiayIn {
  try {
    const gt = window.localStorage.getItem(KHO_GIAY_LUU_KEY);
    return gt === 'K57' || gt === 'K80' ? gt : 'K80';
  } catch {
    return 'K80';
  }
}

/** Không chặn in nếu localStorage bị chặn — chỉ là tiện ích nhớ lựa chọn. */
export function luuKhoGiayDaChon(khoGiay: KhoGiayIn): void {
  try {
    window.localStorage.setItem(KHO_GIAY_LUU_KEY, khoGiay);
  } catch {
    // bỏ qua — chế độ ẩn danh hoặc trình duyệt chặn localStorage
  }
}

export interface DongInHoaDon {
  maHang: string;
  ten: string;
  donViTen: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
}

export interface HoaDonDeIn {
  ma: string;
  /** ISO, giờ thiết bị lúc bán — SPEC.md §3.6 lưu UTC, hiển thị giờ VN. */
  thoiGian: string;
  dong: DongInHoaDon[];
  tongTienHang: number;
  giamGia: number;
  thuKhac: number;
  khachCanTra: number;
  phuongThucThanhToan: PhuongThucThanhToan;
  /** `undefined` khi không phải tiền mặt — không có khái niệm "khách đưa" cho chuyển khoản/thẻ/ví. */
  khachThanhToan?: number;
  tienThua?: number;
}

/** Chỉ những trường `InHoaDon` thật sự cần từ một dòng giỏ hàng — khai riêng
 * (không import `DongGioHang` từ `BanHang.tsx`) để tránh vòng import giữa hai
 * file, `DongGioHang` khớp cấu trúc này nên gọi trực tiếp được, không cần map. */
export interface DongGioHangChoIn {
  maHang: string;
  ten: string;
  donViTen: string;
  giaBan: number;
  soLuong: number;
}

/** Ghép giỏ hàng (đã dùng để gửi `POST /api/hoa-don`) với kết quả server trả
 * về thành nội dung cần in — không gọi thêm API nào: mọi thứ đã có sẵn ở
 * client ngay lúc thanh toán (chứng từ "sao chép giá lúc bán", SPEC.md §5.4). */
export function xayDungHoaDonDeIn(
  gioHang: readonly DongGioHangChoIn[],
  ketQua: HoaDonRes,
  thanhToan: { phuongThucThanhToan: PhuongThucThanhToan; khachThanhToan?: number },
): HoaDonDeIn {
  const coTienMat =
    thanhToan.phuongThucThanhToan === 'TIEN_MAT' && thanhToan.khachThanhToan !== undefined;

  return {
    ma: ketQua.ma,
    thoiGian: ketQua.thoiGian,
    dong: gioHang.map((d) => ({
      maHang: d.maHang,
      ten: d.ten,
      donViTen: d.donViTen,
      soLuong: d.soLuong,
      donGia: d.giaBan,
      thanhTien: d.giaBan * d.soLuong,
    })),
    tongTienHang: ketQua.tongTienHang,
    giamGia: ketQua.giamGia,
    thuKhac: ketQua.thuKhac,
    khachCanTra: ketQua.khachCanTra,
    phuongThucThanhToan: thanhToan.phuongThucThanhToan,
    ...(coTienMat
      ? {
          khachThanhToan: thanhToan.khachThanhToan,
          tienThua: (thanhToan.khachThanhToan ?? 0) - ketQua.khachCanTra,
        }
      : {}),
  };
}

function nhanPhuongThuc(gia: PhuongThucThanhToan): string {
  return CAC_PHUONG_THUC.find((p) => p.gia === gia)?.nhan ?? gia;
}

interface InHoaDonProps {
  /** `undefined` = không hiện gì — chưa có hoá đơn nào vừa tạo cần in. */
  hoaDon: HoaDonDeIn | undefined;
  khoGiay: KhoGiayIn;
  onDoiKhoGiay: (khoGiay: KhoGiayIn) => void;
  onDong: () => void;
}

/** Preview + in hoá đơn K57/K80 (T-023). Mở ngay sau khi thanh toán thành
 * công — khớp phím tắt "Enter xác nhận thanh toán và in" (UI-FIDELITY.md nhóm
 * 2): Enter đầu xác nhận thanh toán và mở preview này với nút "In" đã focus
 * sẵn, Enter thứ hai in luôn — không bắt rời tay khỏi bàn phím. Vẫn hiện
 * preview (không tự in ngay) để không tốn giấy khi lỡ tay. */
export function InHoaDon({ hoaDon, khoGiay, onDoiKhoGiay, onDong }: InHoaDonProps) {
  const nutInRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hoaDon) nutInRef.current?.focus();
  }, [hoaDon]);

  if (!hoaDon) return null;

  const rongMm = CHIEU_RONG_MM[khoGiay];

  return (
    <div className="in-hoa-don__man-phu" role="presentation">
      {/* @page phải đặt theo khổ giấy đang chọn — CSS không chọn được @page
       * theo class, nên tự sinh nội dung style theo state (T-023). */}
      <style>{`@page { size: ${rongMm}mm auto; margin: 0; }`}</style>
      <div
        className="in-hoa-don"
        role="dialog"
        aria-modal="true"
        aria-label="In hoá đơn"
        onKeyDown={(su) => {
          if (su.key === 'Escape') onDong();
        }}
      >
        <header className="in-hoa-don__dau">
          <h2 className="in-hoa-don__tieu-de">In hoá đơn</h2>
          <button type="button" aria-label="Đóng" className="in-hoa-don__dong" onClick={onDong}>
            ×
          </button>
        </header>

        <fieldset className="in-hoa-don__kho-giay" aria-label="Khổ giấy">
          {(['K57', 'K80'] as const).map((k) => (
            <label key={k} className="in-hoa-don__radio-kho">
              <input
                type="radio"
                name="in-hoa-don-kho-giay"
                value={k}
                checked={khoGiay === k}
                onChange={() => onDoiKhoGiay(k)}
              />
              {k} ({CHIEU_RONG_MM[k]}mm)
            </label>
          ))}
        </fieldset>

        <div className="in-hoa-don__khung-xem-truoc">
          <div className="in-hoa-don__to-giay" style={{ width: `${rongMm}mm` }}>
            <p className="in-hoa-don__quay">Quầy chính</p>
            <h3 className="in-hoa-don__hoa-don-de">HOÁ ĐƠN BÁN HÀNG</h3>
            <p>
              Số: <strong>{hoaDon.ma}</strong>
            </p>
            <p>Giờ: {dinhDangThoiGianVN(hoaDon.thoiGian)}</p>

            <table className="in-hoa-don__bang">
              <thead>
                <tr>
                  <th>Tên hàng</th>
                  <th>SL</th>
                  <th>Đ.giá</th>
                  <th>T.tiền</th>
                </tr>
              </thead>
              <tbody>
                {hoaDon.dong.map((d, i) => (
                  <tr key={`${d.maHang}-${i}`}>
                    <td>
                      {d.ten} ({d.donViTen})
                    </td>
                    <td>{dinhDangSo(d.soLuong)}</td>
                    <td>{dinhDangTien(dong(d.donGia))}</td>
                    <td>{dinhDangTien(dong(d.thanhTien))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="in-hoa-don__dong-tong">
              <span>Tổng tiền hàng</span>
              <span>{dinhDangTien(dong(hoaDon.tongTienHang))}</span>
            </div>
            {hoaDon.giamGia > 0 ? (
              <div className="in-hoa-don__dong-tong">
                <span>Giảm giá</span>
                <span>-{dinhDangTien(dong(hoaDon.giamGia))}</span>
              </div>
            ) : null}
            {hoaDon.thuKhac > 0 ? (
              <div className="in-hoa-don__dong-tong">
                <span>Thu khác</span>
                <span>{dinhDangTien(dong(hoaDon.thuKhac))}</span>
              </div>
            ) : null}
            <div className="in-hoa-don__dong-tong in-hoa-don__dong-tong--chinh">
              <span>Khách cần trả</span>
              <span>{dinhDangTien(dong(hoaDon.khachCanTra))}</span>
            </div>

            <p>Hình thức: {nhanPhuongThuc(hoaDon.phuongThucThanhToan)}</p>
            {hoaDon.khachThanhToan !== undefined ? (
              <>
                <div className="in-hoa-don__dong-tong">
                  <span>Khách thanh toán</span>
                  <span>{dinhDangTien(dong(hoaDon.khachThanhToan))}</span>
                </div>
                <div className="in-hoa-don__dong-tong">
                  <span>Tiền thừa trả khách</span>
                  <span>{dinhDangTien(dong(hoaDon.tienThua ?? 0))}</span>
                </div>
              </>
            ) : null}

            <p className="in-hoa-don__cam-on">Cảm ơn quý khách!</p>
          </div>
        </div>

        <div className="in-hoa-don__hanh-dong">
          <Nut bienThe="phu" onClick={onDong}>
            Đóng (Esc)
          </Nut>
          <Nut ref={nutInRef} bienThe="chinh" onClick={() => window.print()}>
            In (Enter)
          </Nut>
        </div>
      </div>
    </div>
  );
}
