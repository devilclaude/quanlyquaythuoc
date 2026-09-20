import { useEffect, useRef, useState } from 'react';
import { DanhSachHangHoaResSchema, type HangHoaDanhSachItem } from '../../../shared/hop-dong/hang-hoa';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, OSo, TruongNhap } from '../../thanh-phan';
import './BanHang.css';

// T-020 — Màn bán hàng: tìm và thêm hàng. Phạm vi: ô tìm (F3), gợi ý một
// dòng mỗi đơn vị tính, thêm vào giỏ hoàn toàn bằng bàn phím. Sửa đơn vị/số
// lượng dòng đã có (T-021), thanh toán (T-022), nhiều hoá đơn (T-025), chỉ
// báo online/offline (T-030) đều KHÔNG thuộc phạm vi.

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
}

export interface DongGioHang {
  sanPhamId: string;
  maHang: string;
  ten: string;
  donViTinhId: string;
  donViTen: string;
  giaBan: number;
  soLuong: number;
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
        giaBan: goiY.giaBan,
        soLuong: 1,
      },
    ];
  }
  return gioHang.map((d, i) => (i === viTri ? { ...d, soLuong: d.soLuong + 1 } : d));
}

/** Tổng tiền giỏ hàng — tiền là số nguyên (CLAUDE.md), không có phép chia nào ở đây. */
export function tinhTongTien(gioHang: DongGioHang[]): number {
  return gioHang.reduce((tong, d) => tong + d.giaBan * d.soLuong, 0);
}

/** Tồn hiển thị theo một đơn vị — CHỈ để hiển thị (SPEC.md §3.3), khớp ảnh "Tìm sản phẩm để bán". */
export function dinhDangTonTheoDonVi(tonCoSo: number, heSo: number): string {
  return (tonCoSo / heSo).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

/** Esc hai bước (UI-FIDELITY.md nhóm 2): lần đầu đóng gợi ý, lần hai mới xoá ô tìm. */
export function capNhatEsc(dangMoGoiY: boolean): { dongGoiY: boolean; xoaOTim: boolean } {
  return dangMoGoiY ? { dongGoiY: true, xoaOTim: false } : { dongGoiY: false, xoaOTim: true };
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
}

/** Giỏ hàng của hoá đơn đang mở. Cột khớp thứ tự hàng đã thêm trong ảnh KiotViet. */
export function BangGioHang({ gioHang }: BangGioHangProps) {
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
          <tr key={`${d.sanPhamId}-${d.donViTinhId}`}>
            <OSo>{i + 1}</OSo>
            <td>{d.maHang}</td>
            <td>{d.ten}</td>
            <td>{d.donViTen}</td>
            <OSo>{d.soLuong}</OSo>
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
  const oTimRef = useRef<HTMLInputElement>(null);

  const goiY = tim.trim() ? goiYThoBanDau : [];

  useEffect(() => {
    const tuKhoa = tim.trim();
    if (!tuKhoa) {
      setDangTai(false);
      setLoi(undefined);
      return;
    }

    const dinhThoiGian = setTimeout(() => {
      const controller = new AbortController();
      setDangTai(true);
      setLoi(undefined);

      fetch(`/api/hang-hoa?tim=${encodeURIComponent(tuKhoa)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => {
          setGoiYThoBanDau(layGoiYTimHang(DanhSachHangHoaResSchema.parse(json).duLieu));
          setChiSoChon(0);
          setDangTai(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setLoi('Không tìm được hàng hoá');
          setDangTai(false);
        });

      return () => controller.abort();
    }, 150);

    return () => clearTimeout(dinhThoiGian);
  }, [tim]);

  function chon(g: GoiYBanHang) {
    setGioHang((hienTai) => themVaoGioHang(hienTai, g));
    setTim('');
    setGoiYThoBanDau([]);
    setChiSoChon(0);
    oTimRef.current?.focus();
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
          <BangGioHang gioHang={gioHang} />
        </div>

        <aside className="ban-hang__panel">
          <div className="ban-hang__hang">
            <span>Tổng tiền hàng</span>
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
