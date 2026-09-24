import type { Ref } from 'react';
import type { PhuongThucThanhToan, TaoHoaDonReq } from '../../../shared/hop-dong/hoa-don';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangSo, dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Nut, TruongNhap } from '../../thanh-phan';
import type { DongGioHang } from './BanHang';

// T-022c — panel thanh toán màn bán hàng. Không có screenshot KiotViet tham
// chiếu cho màn/khu vực này trong `docs/reference/kiotviet/` (như T-010c) —
// dựng theo token `.claude/skills/design-system/`, ghi rõ trong PR. Gọi
// `POST /api/hoa-don` (T-022b) đã có sẵn — không viết lại logic nghiệp vụ nào
// ở đây, chỉ tính preview và validate phía client trước khi gửi.

/** Mệnh giá tiền mặt phổ biến cho nút "tiền mặt nhanh" (Xong khi T-022c). */
export const MENH_GIA_NHANH = [50_000, 100_000, 200_000, 500_000];

/** Khách cần trả xem trước ở client — CÙNG công thức SPEC.md §3.4, nhưng chỉ
 * để hiển thị ngay khi gõ; số thật do server tính lúc `POST /api/hoa-don` trả
 * về (`lam_tron` mặc định tắt, luôn 0 ở slice này — T-022a/T-022b). */
export function tinhKhachCanTraXemTruoc(tongTienHang: number, giamGia: number, thuKhac: number): number {
  return tongTienHang - giamGia + thuKhac;
}

/** Tiền thừa trả khách (SPEC.md §7 vocab) — âm nghĩa là khách đưa chưa đủ. */
export function tinhTienThua(khachThanhToan: number, khachCanTra: number): number {
  return khachThanhToan - khachCanTra;
}

/** Chuỗi nhập tay → số nguyên không âm, hoặc `undefined` nếu không hợp lệ.
 * Rỗng coi là 0 (chưa gõ gì = chưa giảm giá/thu khác gì). SPEC.md §3.4 cấm số
 * thực cho tiền ở mọi tầng, kể cả biến trung gian phía client. */
export function soNguyenKhongAmTuChuoi(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return 0;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/** Như trên, nhưng dành riêng cho ô "Khách thanh toán": rỗng nghĩa là khách
 * đưa VỪA ĐỦ (`khachCanTra`) — mặc định của đa số lượt bán — không phải 0.
 * Cho gõ tay số khác khi khách đưa tiền chẵn cần trả lại tiền thừa. */
export function soTienKhachThanhToanTuChuoi(raw: string, khachCanTra: number): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return khachCanTra;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/** Trạng thái form thanh toán — chuỗi nhập tay, cùng khuôn với
 * `TrangThaiFormTaoHangHoa` (T-009b/T-009c). */
export interface TrangThaiPanelThanhToan {
  giamGia: string;
  thuKhac: string;
  phuongThucThanhToan: PhuongThucThanhToan;
  khachThanhToan: string;
}

export function trangThaiThanhToanRong(): TrangThaiPanelThanhToan {
  return { giamGia: '0', thuKhac: '0', phuongThucThanhToan: 'TIEN_MAT', khachThanhToan: '' };
}

/** Validate phía client TRƯỚC khi gọi API — không thay thế 409 thật của server
 * (T-022a: `GiamGiaVuotTongError`/`KhongDuTonKhoError`), chỉ để phản hồi ngay
 * không phải đợi round-trip cho hai lỗi gõ tay phổ biến nhất. */
export function kiemTraThanhToanHopLe(tuyChon: {
  phuongThucThanhToan: PhuongThucThanhToan;
  khachThanhToan: number;
  khachCanTra: number;
}): string | undefined {
  if (tuyChon.khachCanTra < 0) return 'Giảm giá vượt tổng tiền hàng';
  if (tuyChon.phuongThucThanhToan === 'TIEN_MAT' && tuyChon.khachThanhToan < tuyChon.khachCanTra) {
    return 'Khách thanh toán chưa đủ';
  }
  return undefined;
}

/** Ánh xạ giỏ hàng (đã có sẵn giá/hệ số/đơn vị lúc bán — T-020/T-021) sang
 * đúng hợp đồng `TaoHoaDonReq` (T-022b): dòng giỏ hàng là bản sao chép giá lúc
 * bán, không tham chiếu lại `don_vi_tinh` (SPEC.md §5.4). */
export function xayDungYeuCauTaoHoaDon(
  gioHang: DongGioHang[],
  tuyChon: { phuongThucThanhToan: PhuongThucThanhToan; giamGia: number; thuKhac: number },
): TaoHoaDonReq {
  return {
    phuongThucThanhToan: tuyChon.phuongThucThanhToan,
    giamGia: tuyChon.giamGia,
    thuKhac: tuyChon.thuKhac,
    dong: gioHang.map((d) => ({
      sanPhamId: d.sanPhamId,
      donViTen: d.donViTen,
      heSo: d.heSo,
      donGia: d.giaBan,
      soLuong: d.soLuong,
    })),
  };
}

interface PanelThanhToanProps {
  soMon: number;
  tongTien: number;
  trangThai: TrangThaiPanelThanhToan;
  /** true khi đang chờ phản hồi POST /api/hoa-don — chặn sửa/gửi lại trong lúc chờ. */
  dangGui: boolean;
  loi: string | undefined;
  thongBao: string | undefined;
  gioHangRong: boolean;
  /** F9 (UI-FIDELITY.md nhóm 2) focus vào đây — đích đầu tiên của "khu vực thanh toán". */
  phuongThucRef: Ref<HTMLSelectElement>;
  onDoi: (trangThai: TrangThaiPanelThanhToan) => void;
  onSubmit: () => void;
}

/**
 * Thuần theo props (cùng khuôn `FormTaoHangHoa`/`KhoiCaiDatToanCuc`) — form
 * HTML thật để Enter ở bất kỳ ô nào trong panel cũng xác nhận thanh toán
 * (hành vi submit ngầm định của trình duyệt khi có nút submit), không cần bắt
 * phím Enter thủ công. Nút tiền mặt nhanh là `type="button"` nên Enter trên
 * chúng chỉ kích hoạt chính nó, không submit form.
 */
export function PanelThanhToan({
  soMon,
  tongTien,
  trangThai,
  dangGui,
  loi,
  thongBao,
  gioHangRong,
  phuongThucRef,
  onDoi,
  onSubmit,
}: PanelThanhToanProps) {
  const giamGiaSo = soNguyenKhongAmTuChuoi(trangThai.giamGia) ?? 0;
  const thuKhacSo = soNguyenKhongAmTuChuoi(trangThai.thuKhac) ?? 0;
  const khachCanTra = tinhKhachCanTraXemTruoc(tongTien, giamGiaSo, thuKhacSo);
  const khachThanhToanSo = soTienKhachThanhToanTuChuoi(trangThai.khachThanhToan, khachCanTra) ?? khachCanTra;
  const tienThua = tinhTienThua(khachThanhToanSo, khachCanTra);
  const laTienMat = trangThai.phuongThucThanhToan === 'TIEN_MAT';

  return (
    <form
      className="thanh-toan"
      onSubmit={(su) => {
        su.preventDefault();
        onSubmit();
      }}
      onKeyDown={(su) => {
        // Enter trên <input> submit form theo hành vi ngầm định của trình
        // duyệt (bắt ở `onSubmit` trên) — nhưng Enter trên <select> (phương
        // thức thanh toán) KHÔNG submit form trong Chromium, nên bắt tay ở
        // đây để F9 → Enter luôn xác nhận được dù đang đứng ở select. Bỏ qua
        // <button> (nút tiền nhanh, nút Thanh toán) để mỗi nút tự xử lý click
        // của chính nó.
        if (su.key === 'Enter' && (su.target as HTMLElement).tagName === 'SELECT') {
          su.preventDefault();
          onSubmit();
        }
      }}
    >
      <h2 className="thanh-toan__tieu-de">
        Thanh toán <kbd>F9</kbd>
      </h2>

      <div className="ban-hang__hang">
        <span>
          Tổng tiền hàng <span className="so">{soMon}</span>
        </span>
        <span className="so">{dinhDangTien(dong(tongTien))}</span>
      </div>

      <TruongNhap
        nhan="Giảm giá"
        kieu="so"
        value={trangThai.giamGia}
        disabled={dangGui}
        onChange={(su) => onDoi({ ...trangThai, giamGia: su.target.value })}
      />
      <TruongNhap
        nhan="Thu khác"
        kieu="so"
        value={trangThai.thuKhac}
        disabled={dangGui}
        onChange={(su) => onDoi({ ...trangThai, thuKhac: su.target.value })}
      />

      <div className="ban-hang__hang ban-hang__hang--can-tra">
        <span>Khách cần trả</span>
        <span className="so">{dinhDangTien(dong(khachCanTra))}</span>
      </div>

      <div className="thanh-toan__truong">
        <label htmlFor="thanh-toan-phuong-thuc">Phương thức thanh toán</label>
        <select
          id="thanh-toan-phuong-thuc"
          ref={phuongThucRef}
          value={trangThai.phuongThucThanhToan}
          disabled={dangGui}
          onChange={(su) => onDoi({ ...trangThai, phuongThucThanhToan: su.target.value as PhuongThucThanhToan })}
        >
          <option value="TIEN_MAT">Tiền mặt</option>
          <option value="CHUYEN_KHOAN">Chuyển khoản</option>
          <option value="THE">Thẻ</option>
          <option value="VI">Ví</option>
        </select>
      </div>

      {laTienMat ? (
        <>
          <div className="thanh-toan__tien-nhanh">
            {MENH_GIA_NHANH.map((mc) => (
              <button
                type="button"
                key={mc}
                disabled={dangGui}
                onClick={() => onDoi({ ...trangThai, khachThanhToan: String(mc) })}
              >
                {dinhDangSo(mc)}
              </button>
            ))}
            <button
              type="button"
              disabled={dangGui}
              onClick={() => onDoi({ ...trangThai, khachThanhToan: String(khachCanTra) })}
            >
              Đủ tiền
            </button>
          </div>

          <TruongNhap
            nhan="Khách thanh toán"
            kieu="so"
            placeholder={dinhDangSo(khachCanTra)}
            value={trangThai.khachThanhToan}
            disabled={dangGui}
            onChange={(su) => onDoi({ ...trangThai, khachThanhToan: su.target.value })}
          />

          <div className="ban-hang__hang">
            <span>Tiền thừa trả khách</span>
            <span className="so">{dinhDangTien(dong(tienThua))}</span>
          </div>
        </>
      ) : null}

      {loi ? (
        <p className="thanh-toan__loi" role="alert">
          {loi}
        </p>
      ) : null}
      {thongBao ? (
        <p className="thanh-toan__thong-bao" role="status">
          {thongBao}
        </p>
      ) : null}

      <Nut type="submit" bienThe="chinh" disabled={gioHangRong || dangGui}>
        {dangGui ? 'Đang thanh toán…' : 'Thanh toán (Enter)'}
      </Nut>
    </form>
  );
}
