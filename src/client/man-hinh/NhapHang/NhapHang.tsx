import { useCallback, useEffect, useRef, useState } from 'react';
import { giaiNghiaCaiDatQuanLyLo, type GhiDeQuanLyLo } from '../../../shared/cai-dat/giai-nghia';
import { CaiDatToanCucResSchema } from '../../../shared/hop-dong/cai-dat';
import {
  DanhSachHangHoaResSchema,
  HangHoaChiTietResSchema,
  type HangHoaChiTietRes,
} from '../../../shared/hop-dong/hang-hoa';
import { PhieuNhapResSchema, type TaoPhieuNhapReq } from '../../../shared/hop-dong/phieu-nhap';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, Nut, OSo, TruongNhap } from '../../thanh-phan';
import { TaoMoiHangHoa } from '../HangHoa/TaoMoiHangHoa';
import {
  DanhSachGoiY,
  capNhatEsc,
  diChuyenChiSoGoiY,
  layGoiYTimHang,
  type GoiYBanHang,
} from '../BanHang/BanHang';
import { InTemMa, xayDungDsTemTuPhieuNhap, type DongTemUI } from './InTemMa';
import { NhapHangTuExcel } from './NhapHangTuExcel';
import './NhapHang.css';

// T-040c1 — Phiếu nhập: giao diện (tìm hàng đã có). Tái dùng NGUYÊN khối tìm +
// gợi ý của T-020. Chọn một gợi ý LUÔN thêm MỘT DÒNG MỚI (không gộp trùng sản
// phẩm+đơn vị). T-040c2 — nút "+" cạnh ô tìm mở `TaoMoiHangHoa` (T-009b) NGAY
// TRONG màn, không rời màn; tạo xong thêm thẳng vào phiếu qua cùng đường
// `chon()` đã có (đơn vị cơ sở của hàng vừa tạo).

export interface DongPhieuNhapUI {
  id: string;
  sanPhamId: string;
  maHang: string;
  ten: string;
  donViTinhId: string;
  donViTen: string;
  heSo: number;
  donGia: number;
  soLuong: number;
  soLo: string;
  hsd: string;
  /** Quản lý lô hiệu lực cho sản phẩm NÀY, giải nghĩa MỘT LẦN lúc thêm dòng (SPEC.md §3.2). */
  quanLyLoBat: boolean;
  dsDonVi: GoiYBanHang['dsDonVi'];
}

/** Thêm một gợi ý thành MỘT DÒNG MỚI luôn luôn — xem ghi chú đầu file. */
export function themDongPhieuNhap(
  dsDong: DongPhieuNhapUI[],
  goiY: GoiYBanHang,
  quanLyLoBat: boolean,
  idMoi: string,
): DongPhieuNhapUI[] {
  return [
    ...dsDong,
    {
      id: idMoi,
      sanPhamId: goiY.sanPhamId,
      maHang: goiY.maHang,
      ten: goiY.ten,
      donViTinhId: goiY.donViTinhId,
      donViTen: goiY.donViTen,
      heSo: goiY.heSo,
      donGia: 0,
      soLuong: 1,
      soLo: '',
      hsd: '',
      quanLyLoBat,
      dsDonVi: goiY.dsDonVi,
    },
  ];
}

export function xoaDongPhieuNhap(dsDong: DongPhieuNhapUI[], chiSo: number): DongPhieuNhapUI[] {
  return dsDong.filter((_, i) => i !== chiSo);
}

/** Gợi ý MỘT đơn vị (cơ sở) từ hàng hoá vừa tạo ngay trong màn (T-040c2) —
 * khác gợi ý tìm-đã-có vì chỉ có một hàng vừa tạo, không cần chọn giữa nhiều
 * đơn vị. `undefined` khi hàng hoá không có đơn vị cơ sở nào (không xảy ra
 * trong luồng bình thường — `POST /api/hang-hoa` luôn tạo đúng một). */
export function xayDungGoiYTuHangMoiTao(chiTiet: HangHoaChiTietRes): GoiYBanHang | undefined {
  const donViCoSo = chiTiet.donViTinh.find((d) => d.laCoSo);
  if (!donViCoSo) return undefined;
  return {
    sanPhamId: chiTiet.id,
    maHang: chiTiet.maHang,
    ten: chiTiet.ten,
    donViTinhId: donViCoSo.id,
    donViTen: donViCoSo.ten,
    heSo: donViCoSo.heSo,
    giaBan: donViCoSo.giaBan,
    tonKhoCoSo: chiTiet.tonKho,
    dsDonVi: chiTiet.donViTinh,
  };
}

/** Chỉ nhận số nguyên >= 1 — số lượng 0 hay âm không hợp lệ cho một dòng nhập. */
export function suaSoLuongDongPhieuNhap(
  dsDong: DongPhieuNhapUI[],
  chiSo: number,
  soLuongMoi: number,
): DongPhieuNhapUI[] {
  if (!Number.isInteger(soLuongMoi) || soLuongMoi < 1) return dsDong;
  return dsDong.map((d, i) => (i === chiSo ? { ...d, soLuong: soLuongMoi } : d));
}

/** Đơn giá >= 0 — SPEC.md §3.4 cấm số thực, nhưng 0 vẫn hợp lệ (hàng khuyến mãi). */
export function suaDonGiaDongPhieuNhap(dsDong: DongPhieuNhapUI[], chiSo: number, donGiaMoi: number): DongPhieuNhapUI[] {
  if (!Number.isInteger(donGiaMoi) || donGiaMoi < 0) return dsDong;
  return dsDong.map((d, i) => (i === chiSo ? { ...d, donGia: donGiaMoi } : d));
}

export function suaSoLoDongPhieuNhap(dsDong: DongPhieuNhapUI[], chiSo: number, soLoMoi: string): DongPhieuNhapUI[] {
  return dsDong.map((d, i) => (i === chiSo ? { ...d, soLo: soLoMoi } : d));
}

export function suaHsdDongPhieuNhap(dsDong: DongPhieuNhapUI[], chiSo: number, hsdMoi: string): DongPhieuNhapUI[] {
  return dsDong.map((d, i) => (i === chiSo ? { ...d, hsd: hsdMoi } : d));
}

/** Đổi đơn vị — giá KHÔNG đổi theo (đơn giá nhập tự gõ, khác `doiDonViDongGioHang` bán hàng). */
export function doiDonViDongPhieuNhap(
  dsDong: DongPhieuNhapUI[],
  chiSo: number,
  donViTinhId: string,
): DongPhieuNhapUI[] {
  const dongHienTai = dsDong[chiSo];
  const donViMoi = dongHienTai?.dsDonVi.find((d) => d.id === donViTinhId);
  if (!dongHienTai || !donViMoi) return dsDong;
  return dsDong.map((d, i) =>
    i === chiSo ? { ...d, donViTinhId: donViMoi.id, donViTen: donViMoi.ten, heSo: donViMoi.heSo } : d,
  );
}

/** Phím F2 (UI-FIDELITY.md nhóm 2): đổi dòng đang chọn sang đơn vị kế tiếp, quay vòng. */
export function doiDonViKeTiepPhieuNhap(dsDong: DongPhieuNhapUI[], chiSo: number): DongPhieuNhapUI[] {
  const dongHienTai = dsDong[chiSo];
  if (!dongHienTai || dongHienTai.dsDonVi.length < 2) return dsDong;
  const viTriHienTai = dongHienTai.dsDonVi.findIndex((d) => d.id === dongHienTai.donViTinhId);
  const donViMoi = dongHienTai.dsDonVi[diChuyenChiSoGoiY(viTriHienTai, dongHienTai.dsDonVi.length, 'ArrowDown')];
  if (!donViMoi) return dsDong;
  return doiDonViDongPhieuNhap(dsDong, chiSo, donViMoi.id);
}

export function tinhTongTienHangPhieuNhap(dsDong: DongPhieuNhapUI[]): number {
  return dsDong.reduce((tong, d) => tong + d.donGia * d.soLuong, 0);
}

/** Validate client TRƯỚC khi gọi API hoàn thành — không thay 409 thật của server. */
export function validatePhieuNhap(dsDong: DongPhieuNhapUI[]): string | undefined {
  if (dsDong.length === 0) return 'Chưa có hàng nào trong phiếu';
  for (const d of dsDong) {
    if (d.soLuong < 1) return `Số lượng dòng "${d.ten}" phải lớn hơn 0`;
    if (d.donGia < 0) return `Đơn giá dòng "${d.ten}" không hợp lệ`;
    const coSoLo = d.soLo.trim() !== '';
    const coHsd = d.hsd.trim() !== '';
    if (d.quanLyLoBat && (!coSoLo || !coHsd)) return `Dòng "${d.ten}" thiếu số lô hoặc hạn dùng`;
    if (coSoLo !== coHsd) return `Dòng "${d.ten}" phải khai đủ cả số lô lẫn hạn dùng`;
  }
  return undefined;
}

/** Ánh xạ dòng UI sang `TaoPhieuNhapReq` — lô/HSD chỉ gửi khi đã gõ (phẳng để trống). */
export function xayDungYeuCauTaoPhieuNhap(dsDong: DongPhieuNhapUI[], hoanThanhNgay: boolean): TaoPhieuNhapReq {
  return {
    hoanThanhNgay,
    dong: dsDong.map((d) => {
      const soLo = d.soLo.trim();
      const hsd = d.hsd.trim();
      return {
        sanPhamId: d.sanPhamId,
        donViTen: d.donViTen,
        heSo: d.heSo,
        donGia: d.donGia,
        soLuong: d.soLuong,
        ...(soLo !== '' ? { soLo } : {}),
        ...(hsd !== '' ? { hsd } : {}),
      };
    }),
  };
}

interface BangDongPhieuNhapProps {
  dsDong: DongPhieuNhapUI[];
  chiSoDongChon: number;
  onChonDong: (chiSo: number) => void;
  onDoiDonVi: (chiSo: number, donViTinhId: string) => void;
  onSuaSoLuong: (chiSo: number, soLuong: number) => void;
  onSuaDonGia: (chiSo: number, donGia: number) => void;
  onSuaSoLo: (chiSo: number, soLo: string) => void;
  onSuaHsd: (chiSo: number, hsd: string) => void;
  onXoaDong: (chiSo: number) => void;
}

/** Bảng dòng phiếu nhập — cột khớp ảnh "Đã nhập 2 hàng". Cột "Số lô"/"Hạn dùng"
 * THÊM VÀO, chỉ hiện khi có ít nhất một dòng bật quản lý lô. */
export function BangDongPhieuNhap({
  dsDong,
  chiSoDongChon,
  onChonDong,
  onDoiDonVi,
  onSuaSoLuong,
  onSuaDonGia,
  onSuaSoLo,
  onSuaHsd,
  onXoaDong,
}: BangDongPhieuNhapProps) {
  if (dsDong.length === 0) {
    return (
      <div className="ban-hang__gio-trong">
        <p>
          Chưa có hàng trong phiếu.
          <br />
          Gõ tên hoặc mã hàng vào ô tìm rồi <kbd>Enter</kbd> để thêm.
        </p>
      </div>
    );
  }

  const hienCotLo = dsDong.some((d) => d.quanLyLoBat);

  return (
    <Bang>
      <thead>
        <tr>
          <th></th>
          <th>STT</th>
          <th>Mã hàng</th>
          <th>Tên hàng</th>
          <th>ĐVT</th>
          <th>Số lượng</th>
          <th>Đơn giá</th>
          {hienCotLo ? (
            <>
              <th>Số lô</th>
              <th>Hạn dùng</th>
            </>
          ) : null}
          <th>Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        {dsDong.map((d, i) => (
          <tr
            key={d.id}
            className={['gio-hang__dong', i === chiSoDongChon ? 'gio-hang__dong--chon' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChonDong(i)}
          >
            <td>
              <button
                type="button"
                className="gio-hang__nut-xoa"
                aria-label={`Xoá dòng ${d.ten} khỏi phiếu nhập`}
                onClick={(su) => {
                  su.stopPropagation();
                  onXoaDong(i);
                }}
              >
                ✕
              </button>
            </td>
            <OSo>{i + 1}</OSo>
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
              <input
                type="number"
                min={1}
                step={1}
                aria-label={`Số lượng ${d.ten}`}
                value={d.soLuong}
                onClick={(su) => su.stopPropagation()}
                onChange={(su) => onSuaSoLuong(i, Number.parseInt(su.target.value, 10))}
              />
            </OSo>
            <OSo>
              <input
                type="number"
                min={0}
                step={1}
                aria-label={`Đơn giá ${d.ten}`}
                value={d.donGia}
                onClick={(su) => su.stopPropagation()}
                onChange={(su) => onSuaDonGia(i, Number.parseInt(su.target.value, 10))}
              />
            </OSo>
            {hienCotLo ? (
              <>
                <td>
                  {d.quanLyLoBat ? (
                    <input
                      type="text"
                      aria-label={`Số lô ${d.ten}`}
                      placeholder="Số lô"
                      value={d.soLo}
                      onClick={(su) => su.stopPropagation()}
                      onChange={(su) => onSuaSoLo(i, su.target.value)}
                    />
                  ) : (
                    <span className="phieu-nhap__khong-ap-dung">—</span>
                  )}
                </td>
                <td>
                  {d.quanLyLoBat ? (
                    <input
                      type="date"
                      aria-label={`Hạn dùng ${d.ten}`}
                      value={d.hsd}
                      onClick={(su) => su.stopPropagation()}
                      onChange={(su) => onSuaHsd(i, su.target.value)}
                    />
                  ) : (
                    <span className="phieu-nhap__khong-ap-dung">—</span>
                  )}
                </td>
              </>
            ) : null}
            <OSo>
              <strong>{dinhDangTien(dong(d.donGia * d.soLuong))}</strong>
            </OSo>
          </tr>
        ))}
      </tbody>
    </Bang>
  );
}

/** Container: ô tìm → gợi ý → thêm dòng → Lưu tạm (F6) / Hoàn thành. */
export function NhapHang() {
  const [tim, setTim] = useState('');
  const [goiYThoBanDau, setGoiYThoBanDau] = useState<GoiYBanHang[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [loiTim, setLoiTim] = useState<string | undefined>(undefined);
  const [chiSoChon, setChiSoChon] = useState(0);
  const [dsDong, setDsDong] = useState<DongPhieuNhapUI[]>([]);
  const [chiSoDongChon, setChiSoDongChon] = useState(-1);
  const [caiDatToanCuc, setCaiDatToanCuc] = useState<boolean | undefined>(undefined);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const [thongBao, setThongBao] = useState<string | undefined>(undefined);
  const [dangTaoHangMoi, setDangTaoHangMoi] = useState(false);
  const [idDongVuaThem, setIdDongVuaThem] = useState<string | undefined>(undefined);
  const [dsTemBanDau, setDsTemBanDau] = useState<DongTemUI[] | undefined>(undefined);
  const oTimRef = useRef<HTMLInputElement>(null);
  const truyVanHienTaiRef = useRef('');
  const goiY = tim.trim() ? goiYThoBanDau : [];

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/cai-dat/quan-ly-lo', { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setCaiDatToanCuc(CaiDatToanCucResSchema.parse(json).bat))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setCaiDatToanCuc(false);
      });
    return () => controller.abort();
  }, []);

  const chayTimKiem = useCallback((tuKhoa: string): void => {
    truyVanHienTaiRef.current = tuKhoa;
    setDangTai(true);
    setLoiTim(undefined);

    fetch(`/api/hang-hoa?tim=${encodeURIComponent(tuKhoa)}`)
      .then((res) => res.json())
      .then((json) => {
        if (truyVanHienTaiRef.current !== tuKhoa) return;
        setGoiYThoBanDau(layGoiYTimHang(DanhSachHangHoaResSchema.parse(json).duLieu));
        setChiSoChon(0);
        setDangTai(false);
      })
      .catch(() => {
        if (truyVanHienTaiRef.current !== tuKhoa) return;
        setLoiTim('Không tìm được hàng hoá');
        setDangTai(false);
      });
  }, []);

  useEffect(() => {
    const tuKhoa = tim.trim();
    if (!tuKhoa) {
      setDangTai(false);
      setLoiTim(undefined);
      return;
    }
    const id = setTimeout(() => chayTimKiem(tuKhoa), 150);
    return () => clearTimeout(id);
  }, [tim, chayTimKiem]);

  async function layGhiDeQuanLyLo(sanPhamId: string): Promise<GhiDeQuanLyLo> {
    const res = await fetch(`/api/hang-hoa/${sanPhamId}`);
    if (!res.ok) throw new Error('Không tải được thông tin hàng hoá');
    return HangHoaChiTietResSchema.parse(await res.json()).quanLyLoGhiDe;
  }

  function chon(g: GoiYBanHang) {
    const idMoi = crypto.randomUUID();
    setTim('');
    setGoiYThoBanDau([]);
    setChiSoChon(0);
    oTimRef.current?.focus();
    layGhiDeQuanLyLo(g.sanPhamId)
      .then((ghiDe) => {
        const quanLyLoBat = giaiNghiaCaiDatQuanLyLo(caiDatToanCuc ?? false, ghiDe);
        setDsDong((ds) => themDongPhieuNhap(ds, g, quanLyLoBat, idMoi));
        setIdDongVuaThem(idMoi);
      })
      .catch(() => setLoi('Không thêm được hàng vào phiếu — thử lại'));
  }

  /** Chọn đúng dòng VỪA THÊM theo id, sau khi `dsDong` đã thực sự chứa nó — không
   * suy chỉ số từ độ dài mảng lúc GỌI `chon()` (sai khi hai lượt chọn tra cứu
   * quản lý lô bất đồng bộ xong KHÔNG theo đúng thứ tự gọi, PR #71). */
  useEffect(() => {
    if (idDongVuaThem === undefined) return;
    const chiSo = dsDong.findIndex((d) => d.id === idDongVuaThem);
    if (chiSo === -1) return;
    setChiSoDongChon(chiSo);
    setIdDongVuaThem(undefined);
  }, [dsDong, idDongVuaThem]);

  /** T-040c2: hàng vừa tạo (`TaoMoiHangHoa`) thêm thẳng vào phiếu qua ĐÚNG
   * đường `chon()` đã có (đơn vị cơ sở) — không viết lại logic thêm dòng. */
  function themHangMoiVaoPhieu(id: string) {
    setDangTaoHangMoi(false);
    fetch(`/api/hang-hoa/${id}`)
      .then((res) => res.json())
      .then((json) => {
        const g = xayDungGoiYTuHangMoiTao(HangHoaChiTietResSchema.parse(json));
        if (!g) throw new Error();
        chon(g);
      })
      .catch(() => setLoi('Đã tạo hàng hoá nhưng không thêm được vào phiếu — tìm lại bằng ô tìm'));
  }

  function xoaDong(chiSo: number) {
    setDsDong((ds) => {
      const dsMoi = xoaDongPhieuNhap(ds, chiSo);
      setChiSoDongChon((hienTai) => (dsMoi.length === 0 ? -1 : Math.min(hienTai, dsMoi.length - 1)));
      return dsMoi;
    });
  }

  function guiPhieu(hoanThanhNgay: boolean) {
    if (dangGui) return;
    const loiHopLe = validatePhieuNhap(dsDong);
    if (loiHopLe) {
      setLoi(loiHopLe);
      return;
    }

    setDangGui(true);
    setLoi(undefined);
    setThongBao(undefined);

    fetch('/api/phieu-nhap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(xayDungYeuCauTaoPhieuNhap(dsDong, hoanThanhNgay)),
    })
      .then(async (res) => {
        if (!res.ok) {
          const json: unknown = await res.json().catch(() => undefined);
          throw new Error((json as { loi?: string } | undefined)?.loi ?? 'Không lưu được phiếu nhập');
        }
        return PhieuNhapResSchema.parse(await res.json());
      })
      .then((phieu) => {
        if (hoanThanhNgay) setDsTemBanDau(xayDungDsTemTuPhieuNhap(dsDong));
        setDsDong([]);
        setChiSoDongChon(-1);
        setDangGui(false);
        setThongBao(hoanThanhNgay ? `Đã hoàn thành phiếu nhập ${phieu.ma}` : `Đã lưu tạm phiếu nhập ${phieu.ma}`);
        oTimRef.current?.focus();
      })
      .catch((err: unknown) => {
        setDangGui(false);
        setLoi(err instanceof Error ? err.message : 'Không lưu được phiếu nhập');
      });
  }

  function xuLyPhimOTim(su: React.KeyboardEvent<HTMLInputElement>) {
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
      if (xoaOTim) setTim('');
      return;
    }

    // Ô tìm THỰC SỰ rỗng — phím tác động lên dòng đang chọn (UI-FIDELITY.md nhóm 2).
    if (tim.trim() === '' && dsDong.length > 0 && chiSoDongChon >= 0) {
      const dongDangChon = dsDong[chiSoDongChon];
      if (su.key === 'ArrowDown' || su.key === 'ArrowUp') {
        su.preventDefault();
        setChiSoDongChon((v) => diChuyenChiSoGoiY(v, dsDong.length, su.key as 'ArrowDown' | 'ArrowUp'));
      } else if (su.key === 'F2') {
        su.preventDefault();
        setDsDong((ds) => doiDonViKeTiepPhieuNhap(ds, chiSoDongChon));
      } else if (su.key === '+' && dongDangChon) {
        su.preventDefault();
        setDsDong((ds) => suaSoLuongDongPhieuNhap(ds, chiSoDongChon, dongDangChon.soLuong + 1));
      } else if (su.key === '-' && dongDangChon) {
        su.preventDefault();
        setDsDong((ds) => suaSoLuongDongPhieuNhap(ds, chiSoDongChon, dongDangChon.soLuong - 1));
      } else if (su.key === 'Delete') {
        su.preventDefault();
        xoaDong(chiSoDongChon);
      }
    }
  }

  useEffect(() => {
    oTimRef.current?.focus();
  }, []);

  useEffect(() => {
    function xuLyPhimToanCuc(su: KeyboardEvent) {
      if (su.key === 'F6') {
        su.preventDefault();
        guiPhieu(false);
      }
    }
    document.addEventListener('keydown', xuLyPhimToanCuc);
    return () => document.removeEventListener('keydown', xuLyPhimToanCuc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsDong, dangGui]);

  const tongTienHang = tinhTongTienHangPhieuNhap(dsDong);

  return (
    <div className="nhap-hang">
      <div className="nhap-hang__thanh-tren">
        <div className="nhap-hang__o-tim">
          <TruongNhap
            ref={oTimRef}
            aria-label="Tìm hàng hoá"
            placeholder="Tìm hàng hóa"
            autoComplete="off"
            value={tim}
            onChange={(su) => setTim(su.target.value)}
            onKeyDown={xuLyPhimOTim}
          />
          <DanhSachGoiY tuKhoa={tim} goiY={goiY} dangTai={dangTai} loi={loiTim} chiSoChon={chiSoChon} onChon={chon} />
        </div>
        <Nut
          bienThe="phu"
          className="nhap-hang__nut-tao-moi"
          aria-label="Tạo hàng mới"
          onClick={() => setDangTaoHangMoi(true)}
        >
          +
        </Nut>
      </div>

      {dangTaoHangMoi ? (
        <TaoMoiHangHoa onHuy={() => setDangTaoHangMoi(false)} onTaoXong={themHangMoiVaoPhieu} />
      ) : null}

      <div className="nhap-hang__than">
        <div className="ban-hang__gio">
          <BangDongPhieuNhap
            dsDong={dsDong}
            chiSoDongChon={chiSoDongChon}
            onChonDong={setChiSoDongChon}
            onDoiDonVi={(chiSo, donViTinhId) => setDsDong((ds) => doiDonViDongPhieuNhap(ds, chiSo, donViTinhId))}
            onSuaSoLuong={(chiSo, soLuong) => setDsDong((ds) => suaSoLuongDongPhieuNhap(ds, chiSo, soLuong))}
            onSuaDonGia={(chiSo, donGia) => setDsDong((ds) => suaDonGiaDongPhieuNhap(ds, chiSo, donGia))}
            onSuaSoLo={(chiSo, soLo) => setDsDong((ds) => suaSoLoDongPhieuNhap(ds, chiSo, soLo))}
            onSuaHsd={(chiSo, hsd) => setDsDong((ds) => suaHsdDongPhieuNhap(ds, chiSo, hsd))}
            onXoaDong={xoaDong}
          />
        </div>

        <aside className="ban-hang__panel">
          <h2 className="thanh-toan__tieu-de">Nhập hàng</h2>
          <div className="ban-hang__hang">
            <span>Tổng tiền hàng</span>
            <span className="so">{dinhDangTien(dong(tongTienHang))}</span>
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

          <div className="nhap-hang__nut">
            <Nut bienThe="phu" disabled={dangGui} onClick={() => guiPhieu(false)}>
              {dangGui ? 'Đang lưu…' : 'Lưu tạm'} <kbd>F6</kbd>
            </Nut>
            <Nut bienThe="chinh" disabled={dangGui} onClick={() => guiPhieu(true)}>
              {dangGui ? 'Đang lưu…' : 'Hoàn thành'}
            </Nut>
          </div>
        </aside>
      </div>

      <NhapHangTuExcel />

      {dsTemBanDau ? (
        <InTemMa
          dsTemBanDau={dsTemBanDau}
          onDong={() => {
            setDsTemBanDau(undefined);
            oTimRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}
