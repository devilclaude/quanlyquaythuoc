import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DanhSachHangHoaResSchema,
  type DonViTinhRes,
  type HangHoaDanhSachItem,
} from '../../../shared/hop-dong/hang-hoa';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, OSo, TruongNhap } from '../../thanh-phan';
import './BanHang.css';

// T-020 — Màn bán hàng: tìm và thêm hàng. T-021 — chọn đơn vị và số lượng
// của dòng đã có trong giỏ (đổi đơn vị bằng dropdown/F2, sửa số lượng bằng
// ô nhập/+/-, xoá dòng bằng nút/Delete — UI-FIDELITY.md nhóm 2). Thanh toán
// (T-022), nhiều hoá đơn (T-025), chỉ báo online/offline (T-030) đều KHÔNG
// thuộc phạm vi.

/** Tối đa số dòng gợi ý hiện cùng lúc — khớp bản thử `docs/reference/prototype/man-ban-hang.html`. */
const SO_DONG_GOI_Y_TOI_DA = 12;

export interface GoiYBanHang {
  sanPhamId: string;
  maHang: string;
  ten: string;
  donViTinhId: string;
  donViTen: string;
  heSo: number;
  giaBan: number;
  tonKhoCoSo: number;
  /** Mọi đơn vị của sản phẩm — cần để đổi đơn vị dòng giỏ hàng sau khi thêm (T-021). */
  dsDonVi: DonViTinhRes[];
}

export interface DongGioHang {
  sanPhamId: string;
  maHang: string;
  ten: string;
  donViTinhId: string;
  donViTen: string;
  /** Hệ số của đơn vị ĐANG CHỌN — dùng để tính số lượng ở đơn vị cơ sở khi trừ kho (SPEC.md §3.3). */
  heSo: number;
  giaBan: number;
  soLuong: number;
  dsDonVi: DonViTinhRes[];
}

/** Một dòng gợi ý mỗi đơn vị tính (khớp ảnh "Tìm sản phẩm để bán": Panadol Extra ra 2 dòng vỉ/hộp). */
export function layGoiYTimHang(duLieu: HangHoaDanhSachItem[]): GoiYBanHang[] {
  const ketQua: GoiYBanHang[] = [];
  for (const hang of duLieu) {
    for (const dv of hang.donViTinh) {
      if (ketQua.length >= SO_DONG_GOI_Y_TOI_DA) return ketQua;
      ketQua.push({
        sanPhamId: hang.id,
        maHang: hang.maHang,
        ten: hang.ten,
        donViTinhId: dv.id,
        donViTen: dv.ten,
        heSo: dv.heSo,
        giaBan: dv.giaBan,
        tonKhoCoSo: hang.tonKho,
        dsDonVi: hang.donViTinh,
      });
    }
  }
  return ketQua;
}

/** Di chuyển dòng đang chọn trong danh sách gợi ý, quay vòng ở hai đầu (UI-FIDELITY.md nhóm 2). */
export function diChuyenChiSoGoiY(
  chiSoHienTai: number,
  tongSo: number,
  phim: 'ArrowDown' | 'ArrowUp',
): number {
  if (phim === 'ArrowDown') return (chiSoHienTai + 1) % tongSo;
  return (chiSoHienTai - 1 + tongSo) % tongSo;
}

/** Thêm gợi ý vào giỏ: đúng sản phẩm+đơn vị đã có thì tăng số lượng, khác đơn vị là dòng riêng. Bất biến. */
export function themVaoGioHang(gioHang: DongGioHang[], goiY: GoiYBanHang): DongGioHang[] {
  const viTri = gioHang.findIndex(
    (d) => d.sanPhamId === goiY.sanPhamId && d.donViTinhId === goiY.donViTinhId,
  );
  if (viTri === -1) {
    return [
      ...gioHang,
      {
        sanPhamId: goiY.sanPhamId,
        maHang: goiY.maHang,
        ten: goiY.ten,
        donViTinhId: goiY.donViTinhId,
        donViTen: goiY.donViTen,
        heSo: goiY.heSo,
        giaBan: goiY.giaBan,
        soLuong: 1,
        dsDonVi: goiY.dsDonVi,
      },
    ];
  }
  return gioHang.map((d, i) => (i === viTri ? { ...d, soLuong: d.soLuong + 1 } : d));
}

/** Đổi đơn vị của một dòng giỏ hàng — giá lấy TRỰC TIẾP từ đơn vị mới, không
 * nhân hệ số (SPEC.md §3.3: giá khai riêng từng đơn vị). Số lượng giữ nguyên;
 * id đơn vị không thuộc sản phẩm của dòng đó thì không đổi gì. */
export function doiDonViDongGioHang(
  gioHang: DongGioHang[],
  chiSo: number,
  donViTinhIdMoi: string,
): DongGioHang[] {
  const dong = gioHang[chiSo];
  const donViMoi = dong?.dsDonVi.find((d) => d.id === donViTinhIdMoi);
  if (!dong || !donViMoi) return gioHang;
  return gioHang.map((d, i) =>
    i === chiSo
      ? { ...d, donViTinhId: donViMoi.id, donViTen: donViMoi.ten, heSo: donViMoi.heSo, giaBan: donViMoi.giaBan }
      : d,
  );
}

/** Phím F2 (UI-FIDELITY.md nhóm 2): đổi dòng đang chọn sang đơn vị kế tiếp
 * trong danh sách đơn vị của sản phẩm, quay vòng. Sản phẩm một đơn vị thì
 * không đổi gì. */
export function doiDonViKeTiep(gioHang: DongGioHang[], chiSo: number): DongGioHang[] {
  const dong = gioHang[chiSo];
  if (!dong || dong.dsDonVi.length < 2) return gioHang;
  const viTriHienTai = dong.dsDonVi.findIndex((d) => d.id === dong.donViTinhId);
  const donViMoi = dong.dsDonVi[diChuyenChiSoGoiY(viTriHienTai, dong.dsDonVi.length, 'ArrowDown')];
  if (!donViMoi) return gioHang;
  return doiDonViDongGioHang(gioHang, chiSo, donViMoi.id);
}

/** Sửa số lượng một dòng giỏ hàng bằng bàn phím. Chỉ nhận số nguyên >= 1 —
 * số lượng 0 hay âm không phải trạng thái hợp lệ của một dòng đang bán, xoá
 * dòng dùng `xoaDongGioHang`. Giá trị không hợp lệ bị bỏ qua, giữ nguyên cũ. */
export function suaSoLuongDongGioHang(gioHang: DongGioHang[], chiSo: number, soLuongMoi: number): DongGioHang[] {
  if (!Number.isInteger(soLuongMoi) || soLuongMoi < 1) return gioHang;
  return gioHang.map((d, i) => (i === chiSo ? { ...d, soLuong: soLuongMoi } : d));
}

/** Xoá một dòng khỏi giỏ hàng theo chỉ số (nút thùng rác hoặc phím Delete). */
export function xoaDongGioHang(gioHang: DongGioHang[], chiSo: number): DongGioHang[] {
  return gioHang.filter((_, i) => i !== chiSo);
}

/** Số lượng ở đơn vị cơ sở của một dòng giỏ hàng — dùng để trừ kho đúng khi
 * thanh toán (SPEC.md §3.3: tồn kho luôn ở đơn vị cơ sở). Luôn dùng hệ số của
 * đơn vị ĐANG CHỌN trên dòng, không phải hệ số lúc thêm vào giỏ. */
export function soLuongCoSoDongGioHang(dong: Pick<DongGioHang, 'soLuong' | 'heSo'>): number {
  return dong.soLuong * dong.heSo;
}

/** Tổng tiền giỏ hàng — tiền là số nguyên (CLAUDE.md), không có phép chia nào ở đây. */
export function tinhTongTien(gioHang: DongGioHang[]): number {
  return gioHang.reduce((tong, d) => tong + d.giaBan * d.soLuong, 0);
}

/** Tổng số lượng mọi dòng — số cạnh nhãn "Tổng tiền hàng" trong ảnh KiotViet, không phải số dòng. */
export function tinhSoMon(gioHang: DongGioHang[]): number {
  return gioHang.reduce((tong, d) => tong + d.soLuong, 0);
}

/** Tồn hiển thị theo một đơn vị — CHỈ để hiển thị (SPEC.md §3.3), khớp ảnh "Tìm sản phẩm để bán". */
export function dinhDangTonTheoDonVi(tonCoSo: number, heSo: number): string {
  return (tonCoSo / heSo).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

/** Esc hai bước (UI-FIDELITY.md nhóm 2): lần đầu đóng gợi ý, lần hai mới xoá ô tìm. */
export function capNhatEsc(dangMoGoiY: boolean): { dongGoiY: boolean; xoaOTim: boolean } {
  return dangMoGoiY ? { dongGoiY: true, xoaOTim: false } : { dongGoiY: false, xoaOTim: true };
}

// T-024 — Quét mã vạch. Máy quét hoạt động như bàn phím gõ cực nhanh rồi
// Enter (UI-FIDELITY.md, DOMAIN-NOTES.md B7); mã tra được (nhà sản xuất hay
// tem tự in) chính là `maHang` đã có từ T-009b — không cần cột/bảng mới, ô
// tìm hiện tại (`GET /api/hang-hoa?tim=`) đã khớp theo `ma_hang`. Việc còn lại
// là làm ô tìm chịu được nhịp gõ đó mà không mất ký tự (xem debug-co-he-thong:
// "Máy quét mất ký tự hoặc mất nhịp" — nghi phạm là debounce nuốt ký tự).

export interface NhipGoTrangThai {
  lanTruocMs: number | null;
  khoangCach: number[];
}

/** Quá 1s không gõ gì coi là bắt đầu một nhịp mới — không cộng dồn xuyên hai lần gõ rời nhau. */
const NGUONG_TAM_DUNG_NHIP_MS = 1000;

/** Ghi nhận một mốc thời gian phím vào chuỗi nhịp gõ hiện tại. Bất biến. */
export function capNhatNhipGo(trangThai: NhipGoTrangThai, moc: number): NhipGoTrangThai {
  if (trangThai.lanTruocMs === null || moc - trangThai.lanTruocMs > NGUONG_TAM_DUNG_NHIP_MS) {
    return { lanTruocMs: moc, khoangCach: [] };
  }
  return { lanTruocMs: moc, khoangCach: [...trangThai.khoangCach, moc - trangThai.lanTruocMs] };
}

/** Ngưỡng khoảng cách trung bình giữa hai ký tự để coi là máy quét — máy quét
 * thật thường dưới 10ms/ký tự, người gõ tay nhanh nhất cũng hiếm khi xuống
 * dưới ngưỡng này LIÊN TỤC qua nhiều ký tự. */
const NGUONG_NHIP_QUET_MS = 50;
/** Số khoảng cách tối thiểu (ký tự - 1) để đủ tin cậy phân loại — từ khoá ngắn
 * gõ nhanh vẫn phải coi là gõ tay, tránh nhận nhầm và bỏ qua lựa chọn bằng
 * mũi tên của người dùng. */
const SO_KHOANG_CACH_TOI_THIEU = 5;

/** Phân biệt luồng quét với luồng gõ tay theo nhịp phím (UI-FIDELITY.md). */
export function phanLoaiNhipGo(khoangCachMs: number[]): 'quet' | 'go-tay' {
  if (khoangCachMs.length < SO_KHOANG_CACH_TOI_THIEU) return 'go-tay';
  const trungBinh = khoangCachMs.reduce((a, b) => a + b, 0) / khoangCachMs.length;
  return trungBinh <= NGUONG_NHIP_QUET_MS ? 'quet' : 'go-tay';
}

export interface KetQuaQuyetDinhSauKhiQuet {
  hanhDong: 'them-vao-gio' | 'hien-goi-y' | 'khong-tim-thay';
  goiYChon?: GoiYBanHang;
}

/** Sau khi xác định là quét (không phải gõ tay): mã khớp đúng MỘT sản phẩm thì
 * thêm thẳng vào giỏ (dòng đầu tiên = đơn vị cơ sở, do API luôn trả cơ sở
 * trước — T-009b), không bắt người dùng chọn lại bằng mũi tên. Khớp nhiều sản
 * phẩm khác nhau (mã chỉ trùng một phần) thì không tự đoán, cứ hiện gợi ý như
 * gõ tay bình thường. */
export function quyetDinhSauKhiQuet(goiY: GoiYBanHang[]): KetQuaQuyetDinhSauKhiQuet {
  const dongDau = goiY[0];
  if (!dongDau) return { hanhDong: 'khong-tim-thay' };
  const soSanPhamKhacNhau = new Set(goiY.map((g) => g.sanPhamId)).size;
  if (soSanPhamKhacNhau === 1) return { hanhDong: 'them-vao-gio', goiYChon: dongDau };
  return { hanhDong: 'hien-goi-y' };
}

interface DanhSachGoiYProps {
  tuKhoa: string;
  goiY: GoiYBanHang[];
  dangTai: boolean;
  loi: string | undefined;
  chiSoChon: number;
  onChon: (goiY: GoiYBanHang) => void;
}

/** Thuần theo props — dựng riêng để test không phải đợi fetch thật. */
export function DanhSachGoiY({ tuKhoa, goiY, dangTai, loi, chiSoChon, onChon }: DanhSachGoiYProps) {
  if (!tuKhoa.trim()) return null;

  return (
    <div className="goi-y" role="listbox" aria-label="Gợi ý hàng hoá">
      {loi ? (
        <p className="goi-y__thong-bao goi-y__thong-bao--loi">{loi}</p>
      ) : dangTai ? (
        <p className="goi-y__thong-bao">Đang tìm…</p>
      ) : goiY.length === 0 ? (
        <p className="goi-y__thong-bao">Không tìm thấy hàng hoá phù hợp</p>
      ) : (
        goiY.map((g, i) => (
          <div
            key={`${g.sanPhamId}-${g.donViTinhId}`}
            role="option"
            aria-selected={i === chiSoChon}
            className={['goi-y__dong', i === chiSoChon ? 'goi-y__dong--chon' : ''].filter(Boolean).join(' ')}
            onClick={() => onChon(g)}
          >
            <div className="goi-y__ten">
              {g.ten}
              <span className="goi-y__badge-dv">{g.donViTen}</span>
            </div>
            <div className="goi-y__gia so">{dinhDangTien(dong(g.giaBan))}</div>
            <div className="goi-y__phu">
              {g.maHang} · Tồn: {dinhDangTonTheoDonVi(g.tonKhoCoSo, g.heSo)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

interface BangGioHangProps {
  gioHang: DongGioHang[];
  /** Chỉ số dòng đang chọn — đích của phím F2/+/-/Delete. -1 = chưa chọn dòng nào. */
  chiSoDongChon: number;
  onChonDong: (chiSo: number) => void;
  onDoiDonVi: (chiSo: number, donViTinhId: string) => void;
  onSuaSoLuong: (chiSo: number, soLuong: number) => void;
  onXoaDong: (chiSo: number) => void;
}

/** Giỏ hàng của hoá đơn đang mở. Cột khớp thứ tự hàng đã thêm trong ảnh KiotViet.
 * Mỗi dòng: đơn vị đổi bằng select, số lượng sửa bằng ô nhập/nút +/-, xoá bằng
 * nút thùng rác — cả ba đều lặp lại được qua phím F2/+/-/Delete ở dòng đang
 * chọn (T-021, UI-FIDELITY.md nhóm 2). */
export function BangGioHang({ gioHang, chiSoDongChon, onChonDong, onDoiDonVi, onSuaSoLuong, onXoaDong }: BangGioHangProps) {
  if (gioHang.length === 0) {
    return (
      <div className="ban-hang__gio-trong">
        <p>
          Chưa có hàng trong đơn.
          <br />
          Bấm <kbd>F3</kbd> rồi gõ tên hoặc mã hàng.
        </p>
      </div>
    );
  }

  return (
    <Bang>
      <thead>
        <tr>
          <th>STT</th>
          <th></th>
          <th>Mã hàng</th>
          <th>Tên hàng</th>
          <th>Đơn vị</th>
          <th>Số lượng</th>
          <th>Đơn giá</th>
          <th>Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        {gioHang.map((d, i) => (
          <tr
            key={`${d.sanPhamId}-${d.donViTinhId}`}
            className={['gio-hang__dong', i === chiSoDongChon ? 'gio-hang__dong--chon' : ''].filter(Boolean).join(' ')}
            onClick={() => onChonDong(i)}
          >
            <OSo>{i + 1}</OSo>
            <td>
              <button
                type="button"
                className="gio-hang__nut-xoa"
                aria-label={`Xoá ${d.ten} khỏi giỏ hàng`}
                onClick={(su) => {
                  su.stopPropagation();
                  onXoaDong(i);
                }}
              >
                ✕
              </button>
            </td>
            <td>{d.maHang}</td>
            <td>{d.ten}</td>
            <td>
              <select
                aria-label={`Đơn vị của ${d.ten}`}
                value={d.donViTinhId}
                onClick={(su) => su.stopPropagation()}
                onChange={(su) => onDoiDonVi(i, su.target.value)}
              >
                {d.dsDonVi.map((dv) => (
                  <option key={dv.id} value={dv.id}>
                    {dv.ten}
                  </option>
                ))}
              </select>
            </td>
            <OSo>
              <div className="gio-hang__so-luong">
                <button
                  type="button"
                  aria-label={`Giảm số lượng ${d.ten}`}
                  disabled={d.soLuong <= 1}
                  onClick={(su) => {
                    su.stopPropagation();
                    onSuaSoLuong(i, d.soLuong - 1);
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  step={1}
                  aria-label={`Số lượng ${d.ten}`}
                  value={d.soLuong}
                  onClick={(su) => su.stopPropagation()}
                  onChange={(su) => onSuaSoLuong(i, Number.parseInt(su.target.value, 10))}
                />
                <button
                  type="button"
                  aria-label={`Tăng số lượng ${d.ten}`}
                  onClick={(su) => {
                    su.stopPropagation();
                    onSuaSoLuong(i, d.soLuong + 1);
                  }}
                >
                  +
                </button>
              </div>
            </OSo>
            <OSo>{dinhDangTien(dong(d.giaBan))}</OSo>
            <OSo>
              <strong>{dinhDangTien(dong(d.giaBan * d.soLuong))}</strong>
            </OSo>
          </tr>
        ))}
      </tbody>
    </Bang>
  );
}

/** Container: ô tìm (F3) → gợi ý theo đơn vị → thêm vào giỏ, toàn bộ bằng bàn phím. */
export function BanHang() {
  const [tim, setTim] = useState('');
  const [goiYThoBanDau, setGoiYThoBanDau] = useState<GoiYBanHang[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const [chiSoChon, setChiSoChon] = useState(0);
  const [gioHang, setGioHang] = useState<DongGioHang[]>([]);
  /** Dòng giỏ hàng đang chọn — đích của F2/+/-/Delete (T-021). -1 = chưa có dòng nào. */
  const [chiSoDongChon, setChiSoDongChon] = useState(-1);
  const oTimRef = useRef<HTMLInputElement>(null);
  /** Nhịp phím đang gõ ở ô tìm — T-024, xem `capNhatNhipGo`/`phanLoaiNhipGo`. */
  const nhipGoRef = useRef<NhipGoTrangThai>({ lanTruocMs: null, khoangCach: [] });
  /** Từ khoá của lần gọi API GẦN NHẤT — chặn kết quả trả về trễ của một truy
   * vấn cũ ghi đè lên kết quả mới hơn (T-024: quét liên tiếp nhiều mã, mã sau
   * không được để mã trước — vốn có thể mạng chậm hơn — đến sau ghi đè). Bản
   * cũ dùng `AbortController` nhưng tạo controller BÊN TRONG callback của
   * `setTimeout` rồi `return` — giá trị đó không đi đâu cả (`setTimeout`
   * không dùng return value), nên chưa từng thực sự huỷ được request nào. */
  const truyVanHienTaiRef = useRef('');
  /** id của debounce đang chờ — để luồng quét huỷ nó, gọi API ngay thay vì đợi 150ms. */
  const dinhThoiGianRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goiY = tim.trim() ? goiYThoBanDau : [];

  /** Gọi API tìm hàng hoá, luôn dùng cho cả debounce (gõ tay) lẫn quét mã (gọi
   * ngay). `useCallback` rỗng deps — chỉ đóng gói setState (định danh ổn định)
   * và ref, không phụ thuộc gì đổi theo lần render, để effect debounce bên
   * dưới không phải liệt kê nó như một dependency đổi mỗi lần render. */
  const chayTimKiem = useCallback((tuKhoa: string): Promise<GoiYBanHang[] | undefined> => {
    truyVanHienTaiRef.current = tuKhoa;
    setDangTai(true);
    setLoi(undefined);

    return fetch(`/api/hang-hoa?tim=${encodeURIComponent(tuKhoa)}`)
      .then((res) => res.json())
      .then((json) => {
        if (truyVanHienTaiRef.current !== tuKhoa) return undefined;
        const goiYMoi = layGoiYTimHang(DanhSachHangHoaResSchema.parse(json).duLieu);
        setGoiYThoBanDau(goiYMoi);
        setChiSoChon(0);
        setDangTai(false);
        return goiYMoi;
      })
      .catch((): undefined => {
        if (truyVanHienTaiRef.current !== tuKhoa) return undefined;
        setLoi('Không tìm được hàng hoá');
        setDangTai(false);
        return undefined;
      });
  }, []);

  useEffect(() => {
    const tuKhoa = tim.trim();
    if (!tuKhoa) {
      setDangTai(false);
      setLoi(undefined);
      return;
    }

    const id = setTimeout(() => {
      void chayTimKiem(tuKhoa);
    }, 150);
    dinhThoiGianRef.current = id;

    return () => clearTimeout(id);
  }, [tim, chayTimKiem]);

  function chon(g: GoiYBanHang) {
    setGioHang((hienTai) => {
      const ketQua = themVaoGioHang(hienTai, g);
      setChiSoDongChon(ketQua.findIndex((d) => d.sanPhamId === g.sanPhamId && d.donViTinhId === g.donViTinhId));
      return ketQua;
    });
    setTim('');
    setGoiYThoBanDau([]);
    setChiSoChon(0);
    nhipGoRef.current = { lanTruocMs: null, khoangCach: [] };
    oTimRef.current?.focus();
  }

  /** Enter ngay sau một chuỗi gõ nhận diện là máy quét (T-024): không đợi
   * debounce, không dùng `goiY` đang hiện (có thể còn của một chuỗi con cũ
   * hơn do debounce chưa kịp chạy) — gọi API ngay cho ĐÚNG mã vừa quét, khớp
   * đúng một sản phẩm thì thêm thẳng vào giỏ. */
  function xuLyQuetMa(tuKhoa: string) {
    if (dinhThoiGianRef.current !== null) {
      clearTimeout(dinhThoiGianRef.current);
      dinhThoiGianRef.current = null;
    }
    void chayTimKiem(tuKhoa).then((ketQua) => {
      if (!ketQua) return;
      const { hanhDong, goiYChon } = quyetDinhSauKhiQuet(ketQua);
      if (hanhDong === 'them-vao-gio' && goiYChon) chon(goiYChon);
    });
  }

  function doiDonVi(chiSo: number, donViTinhId: string) {
    setGioHang((hienTai) => doiDonViDongGioHang(hienTai, chiSo, donViTinhId));
    setChiSoDongChon(chiSo);
  }

  function suaSoLuong(chiSo: number, soLuongMoi: number) {
    if (Number.isNaN(soLuongMoi)) return;
    setGioHang((hienTai) => suaSoLuongDongGioHang(hienTai, chiSo, soLuongMoi));
    setChiSoDongChon(chiSo);
  }

  function xoaDong(chiSo: number) {
    setGioHang((hienTai) => xoaDongGioHang(hienTai, chiSo));
    setChiSoDongChon((v) => (gioHang.length <= 1 ? -1 : Math.min(v, gioHang.length - 2)));
  }

  function xuLyPhimOTim(su: React.KeyboardEvent<HTMLInputElement>) {
    // Chỉ đếm nhịp cho phím "gõ ký tự" thật sự (key dài 1) — Enter/mũi tên/F...
    // không thuộc nhịp gõ nội dung (T-024).
    if (su.key.length === 1) {
      nhipGoRef.current = capNhatNhipGo(nhipGoRef.current, Date.now());
    }

    // Enter ngay sau một chuỗi gõ đủ nhanh và đủ dài để coi là máy quét: bỏ
    // qua `goiY` đang hiện (có thể còn là kết quả của một chuỗi con cũ hơn do
    // debounce 150ms chưa kịp chạy — UI-FIDELITY.md: "không mất ký tự, phân
    // biệt được với người gõ tay bằng nhịp phím"), gọi API ngay cho đúng mã.
    // Gõ tay bình thường (kể cả gõ nhanh nhưng từ khoá ngắn) rơi xuống nhánh
    // Enter cũ bên dưới, giữ nguyên hành vi đã có (T-020/T-021).
    if (su.key === 'Enter' && tim.trim() !== '' && phanLoaiNhipGo(nhipGoRef.current.khoangCach) === 'quet') {
      su.preventDefault();
      xuLyQuetMa(tim.trim());
      return;
    }

    if (goiY.length > 0) {
      if (su.key === 'ArrowDown' || su.key === 'ArrowUp') {
        su.preventDefault();
        setChiSoChon((v) => diChuyenChiSoGoiY(v, goiY.length, su.key as 'ArrowDown' | 'ArrowUp'));
        return;
      }
      if (su.key === 'Enter') {
        su.preventDefault();
        const g = goiY[chiSoChon];
        if (g) chon(g);
        return;
      }
    }
    if (su.key === 'Escape') {
      su.preventDefault();
      const { dongGoiY, xoaOTim } = capNhatEsc(goiY.length > 0);
      if (dongGoiY) setGoiYThoBanDau([]);
      if (xoaOTim) {
        setTim('');
        // Xoá luôn nhịp gõ đang tích luỹ — không để nhịp của từ khoá cũ (vừa
        // xoá) cộng dồn với từ khoá gõ tiếp theo nếu gõ lại trong vòng chưa
        // tới 1s (T-024, phát hiện lúc đối chiếu UI).
        nhipGoRef.current = { lanTruocMs: null, khoangCach: [] };
      }
      return;
    }

    // Ô tìm THỰC SỰ rỗng (không phải chỉ "không có gợi ý" — 0 kết quả khớp
    // hoặc đang chờ debounce cũng khiến goiY rỗng dù người dùng còn đang gõ
    // dở) — phím tác động lên dòng giỏ hàng đang chọn (T-021, UI-FIDELITY.md
    // nhóm 2: F2 đổi đơn vị, +/- sửa số lượng, Delete xoá dòng). Sai chỗ này
    // sẽ nuốt mất ký tự đang gõ dở — UI-FIDELITY.md cấm tuyệt đối.
    if (tim.trim() === '' && gioHang.length > 0 && chiSoDongChon >= 0) {
      const dongDangChon = gioHang[chiSoDongChon];
      if (su.key === 'ArrowDown' || su.key === 'ArrowUp') {
        su.preventDefault();
        setChiSoDongChon((v) => diChuyenChiSoGoiY(v, gioHang.length, su.key as 'ArrowDown' | 'ArrowUp'));
      } else if (su.key === 'F2') {
        su.preventDefault();
        setGioHang((hienTai) => doiDonViKeTiep(hienTai, chiSoDongChon));
      } else if (su.key === '+' && dongDangChon) {
        su.preventDefault();
        suaSoLuong(chiSoDongChon, dongDangChon.soLuong + 1);
      } else if (su.key === '-' && dongDangChon) {
        su.preventDefault();
        suaSoLuong(chiSoDongChon, dongDangChon.soLuong - 1);
      } else if (su.key === 'Delete') {
        su.preventDefault();
        xoaDong(chiSoDongChon);
      }
    }
  }

  // Vào màn là bán ngay — gõ được luôn không cần bấm chuột hay F3 trước.
  useEffect(() => {
    oTimRef.current?.focus();
  }, []);

  useEffect(() => {
    function xuLyPhimToanCuc(su: KeyboardEvent) {
      if (su.key === 'F3') {
        su.preventDefault();
        oTimRef.current?.focus();
        oTimRef.current?.select();
      }
    }
    document.addEventListener('keydown', xuLyPhimToanCuc);
    return () => document.removeEventListener('keydown', xuLyPhimToanCuc);
  }, []);

  const tongTien = tinhTongTien(gioHang);

  return (
    <div className="ban-hang">
      <div className="ban-hang__thanh-tren">
        <div className="ban-hang__o-tim">
          <TruongNhap
            ref={oTimRef}
            aria-label="Tìm hàng hoá"
            placeholder="Tìm hàng hóa (F3)"
            autoComplete="off"
            value={tim}
            onChange={(su) => setTim(su.target.value)}
            onKeyDown={xuLyPhimOTim}
          />
          <DanhSachGoiY tuKhoa={tim} goiY={goiY} dangTai={dangTai} loi={loi} chiSoChon={chiSoChon} onChon={chon} />
        </div>
        <div className="ban-hang__hoa-don-hien-tai">Hoá đơn 1</div>
      </div>

      <div className="ban-hang__than">
        <div className="ban-hang__gio">
          <BangGioHang
            gioHang={gioHang}
            chiSoDongChon={chiSoDongChon}
            onChonDong={setChiSoDongChon}
            onDoiDonVi={doiDonVi}
            onSuaSoLuong={suaSoLuong}
            onXoaDong={xoaDong}
          />
        </div>

        <aside className="ban-hang__panel">
          <div className="ban-hang__hang">
            <span>
              Tổng tiền hàng <span className="so">{tinhSoMon(gioHang)}</span>
            </span>
            <span className="so">{dinhDangTien(dong(tongTien))}</span>
          </div>
          <div className="ban-hang__hang">
            <span>Giảm giá</span>
            <span className="so">0</span>
          </div>
          <div className="ban-hang__hang">
            <span>Thu khác</span>
            <span className="so">0</span>
          </div>
          <div className="ban-hang__hang ban-hang__hang--can-tra">
            <span>Khách cần trả</span>
            <span className="so">{dinhDangTien(dong(tongTien))}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
