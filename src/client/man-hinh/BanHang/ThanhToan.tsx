import type { Ref } from 'react';
import type { PhuongThucThanhToan, TaoHoaDonReq } from '../../../shared/hop-dong/hoa-don';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangSo, dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Nut } from '../../thanh-phan';
import type { DongGioHang } from './BanHang';

// T-022c — panel thanh toán màn bán hàng. Đối chiếu với
// `docs/reference/kiotviet/Bán hàng/Chọn 1 món hàng để bán - có chức năng
// chọn đơn vị và số lượng để bán.png` (giỏ có hàng, Tiền mặt đang chọn) và
// `docs/reference/kiotviet/Bán hàng/Giao diện bán hàng chưa có sản phẩm.png`
// (giỏ rỗng) — bố cục, thứ tự trường, loại control (radio, không phải
// dropdown) và dãy mệnh giá nhanh đều lấy từ hai ảnh này, không phải suy đoán.
// Gọi `POST /api/hoa-don` (T-022b) đã có sẵn — không viết lại logic nghiệp vụ
// nào ở đây, chỉ tính preview và validate phía client trước khi gửi.

/** Mệnh giá tiền giấy VND dùng để làm tròn lên gợi ý "tiền mặt nhanh". */
const MENH_GIA_LAM_TRON = [2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000];

/** Dãy nút tiền mặt nhanh — khớp ảnh "Chọn 1 món hàng để bán...": khách cần
 * trả 17.000đ ra đúng dãy 17.000/18.000/20.000/50.000/100.000/200.000/500.000
 * (làm tròn `khachCanTra` lên từng mệnh giá tiền giấy, gộp trùng, sắp tăng
 * dần). Nút đầu tiên luôn là số tiền đúng bằng khách cần trả — không có nút
 * chữ "Đủ tiền" riêng như bản cũ. */
export function tinhMenhGiaNhanh(khachCanTra: number): number[] {
  const ketQua = new Set<number>([khachCanTra]);
  for (const mg of MENH_GIA_LAM_TRON) {
    ketQua.add(Math.ceil(khachCanTra / mg) * mg);
  }
  return [...ketQua].sort((a, b) => a - b);
}

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

/** Nhãn hiển thị từng phương thức — T-023 (in hoá đơn) dùng lại, không lặp danh sách. */
export const CAC_PHUONG_THUC: ReadonlyArray<{ gia: PhuongThucThanhToan; nhan: string }> = [
  { gia: 'TIEN_MAT', nhan: 'Tiền mặt' },
  { gia: 'CHUYEN_KHOAN', nhan: 'Chuyển khoản' },
  { gia: 'THE', nhan: 'Thẻ' },
  { gia: 'VI', nhan: 'Ví' },
];

interface DongTienNhapProps {
  id: string;
  nhan: string;
  value: string;
  disabled: boolean;
  onChange: (giaTri: string) => void;
}

/** Một dòng nhãn-trái/ô-nhập-phải — khớp cách "Tổng tiền hàng"/"Khách cần trả"
 * xếp hàng trong ảnh KiotViet (khác `TruongNhap` dùng chỗ khác trong dự án,
 * vốn xếp nhãn TRÊN ô nhập — không khớp panel này). */
function DongTienNhap({ id, nhan, value, disabled, onChange }: DongTienNhapProps) {
  return (
    <div className="thanh-toan__dong-tien">
      <label htmlFor={id}>{nhan}</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="thanh-toan__o-tien"
        value={value}
        disabled={disabled}
        onChange={(su) => onChange(su.target.value)}
      />
    </div>
  );
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
  /** F9 (UI-FIDELITY.md nhóm 2) focus vào radio đang chọn bên trong đây. */
  phuongThucRef: Ref<HTMLFieldSetElement>;
  onDoi: (trangThai: TrangThaiPanelThanhToan) => void;
  onSubmit: () => void;
}

/**
 * Thuần theo props (cùng khuôn `FormTaoHangHoa`/`KhoiCaiDatToanCuc`) — form
 * HTML thật để Enter ở bất kỳ ô nào trong panel cũng xác nhận thanh toán.
 * Enter trên `<input>` submit form theo hành vi ngầm định của trình duyệt;
 * Enter trên radio KHÔNG tự submit trong Chromium nên bắt tay ở `onKeyDown`.
 * Nút tiền mặt nhanh là `type="button"` nên Enter trên chúng chỉ kích hoạt
 * chính nó, không submit form.
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
        if (su.key === 'Enter' && su.target instanceof HTMLInputElement && su.target.type === 'radio') {
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

      <DongTienNhap
        id="thanh-toan-giam-gia"
        nhan="Giảm giá"
        value={trangThai.giamGia}
        disabled={dangGui}
        onChange={(giaTri) => onDoi({ ...trangThai, giamGia: giaTri })}
      />
      <DongTienNhap
        id="thanh-toan-thu-khac"
        nhan="Thu khác"
        value={trangThai.thuKhac}
        disabled={dangGui}
        onChange={(giaTri) => onDoi({ ...trangThai, thuKhac: giaTri })}
      />

      <div className="ban-hang__hang ban-hang__hang--can-tra">
        <span>Khách cần trả</span>
        <span className="so">{dinhDangTien(dong(khachCanTra))}</span>
      </div>

      {!gioHangRong ? (
        <>
          {laTienMat ? (
            <DongTienNhap
              id="thanh-toan-khach-thanh-toan"
              nhan="Khách thanh toán"
              value={trangThai.khachThanhToan}
              disabled={dangGui}
              onChange={(giaTri) => onDoi({ ...trangThai, khachThanhToan: giaTri })}
            />
          ) : null}

          <fieldset className="thanh-toan__phuong-thuc" ref={phuongThucRef} aria-label="Phương thức thanh toán">
            {CAC_PHUONG_THUC.map(({ gia, nhan }) => (
              <label key={gia} className="thanh-toan__radio">
                <input
                  type="radio"
                  name="thanh-toan-phuong-thuc"
                  value={gia}
                  checked={trangThai.phuongThucThanhToan === gia}
                  disabled={dangGui}
                  onChange={() => onDoi({ ...trangThai, phuongThucThanhToan: gia })}
                />
                {nhan}
              </label>
            ))}
          </fieldset>

          {laTienMat ? (
            <div className="thanh-toan__tien-nhanh">
              {tinhMenhGiaNhanh(khachCanTra).map((mc) => (
                <button
                  type="button"
                  key={mc}
                  disabled={dangGui}
                  onClick={() => onDoi({ ...trangThai, khachThanhToan: String(mc) })}
                >
                  {dinhDangSo(mc)}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="ban-hang__hang">
        <span>Tiền thừa trả khách</span>
        <span className="so">{dinhDangTien(dong(tienThua))}</span>
      </div>

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
