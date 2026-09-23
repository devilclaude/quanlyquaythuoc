import { useEffect, useState } from 'react';
import type { GhiDeQuanLyLo } from '../../../shared/cai-dat/giai-nghia';
import {
  HangHoaChiTietResSchema,
  type DonViTinhRes,
  type HangHoaChiTietRes,
} from '../../../shared/hop-dong/hang-hoa';
import { dong } from '../../../shared/kieu/dong';
import { soLuongCoSo } from '../../../shared/kieu/so-luong';
import { hienThiGanDung } from '../../../shared/don-vi/quy-doi';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, BadgeTrangThai, Nut } from '../../thanh-phan';
import { SuaHangHoa } from './SuaHangHoa';
import './ChiTietHangHoa.css';

/** Đơn vị hiển thị phụ = đơn vị không phải cơ sở có hệ số lớn nhất (SPEC.md §3.3
 * ví dụ chuẩn: 864 viên hiển thị chính, "≈ 4,8 hộp" hiển thị phụ). */
function donViHienThiPhu(donViTinh: readonly DonViTinhRes[]): DonViTinhRes | undefined {
  return donViTinh
    .filter((d) => !d.laCoSo)
    .reduce<DonViTinhRes | undefined>((lonNhat, d) => (!lonNhat || d.heSo > lonNhat.heSo ? d : lonNhat), undefined);
}

export function ThongTinHangHoa({ chiTiet }: { chiTiet: HangHoaChiTietRes }) {
  const donViCoSo = chiTiet.donViTinh.find((d) => d.laCoSo);
  const donViPhu = donViHienThiPhu(chiTiet.donViTinh);

  return (
    <div className="thong-tin-hang-hoa">
      <h2 className="thong-tin-hang-hoa__ten">{chiTiet.ten}</h2>
      <dl className="thong-tin-hang-hoa__truong">
        <div>
          <dt>Mã hàng</dt>
          <dd>{chiTiet.maHang}</dd>
        </div>
        <div>
          <dt>Tồn kho</dt>
          <dd>
            {chiTiet.tonKho} {donViCoSo?.ten ?? ''}
            {donViPhu ? (
              <span className="thong-tin-hang-hoa__ton-phu">
                {' '}
                ({hienThiGanDung(soLuongCoSo(chiTiet.tonKho), donViPhu.heSo, donViPhu.ten)})
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Giá vốn</dt>
          <dd>{dinhDangTien(dong(chiTiet.giaVon))}</dd>
        </div>
        <div>
          <dt>Giá bán</dt>
          <dd>{dinhDangTien(dong(chiTiet.giaBan))}</dd>
        </div>
      </dl>

      <Bang>
        <thead>
          <tr>
            <th>Đơn vị</th>
            <th>Hệ số</th>
            <th>Giá bán</th>
          </tr>
        </thead>
        <tbody>
          {chiTiet.donViTinh.map((dv) => (
            <tr key={dv.id}>
              <td>
                {dv.ten}
                {dv.laCoSo ? ' (cơ sở)' : ''}
              </td>
              <td>{dv.heSo}</td>
              <td>{dinhDangTien(dong(dv.giaBan))}</td>
            </tr>
          ))}
        </tbody>
      </Bang>
    </div>
  );
}

interface ChanHangHoaProps {
  trangThai: HangHoaChiTietRes['trangThai'];
  coTheXoaCung: boolean;
  dangXuLy: boolean;
  onBamSua: () => void;
  onBamXoaHoacNgungHoatDong: () => void;
}

/**
 * Chân panel chi tiết (T-009c) — vị trí khớp ảnh "xem chi tiết 1 sản phẩm":
 * nút huỷ/ngừng bên trái, "Chỉnh sửa" bên phải. Bỏ "Sao chép"/"In tem mã"/"…"
 * — ngoài phạm vi "Xong khi" T-009c (xem "Cố tình không làm" trong PR).
 */
export function ChanHangHoa({
  trangThai,
  coTheXoaCung,
  dangXuLy,
  onBamSua,
  onBamXoaHoacNgungHoatDong,
}: ChanHangHoaProps) {
  return (
    <footer className="thong-tin-hang-hoa__chan">
      {trangThai === 'NGUNG_HOAT_DONG' ? (
        <BadgeTrangThai mau="trung-tinh">Đã ngừng hoạt động</BadgeTrangThai>
      ) : (
        <Nut bienThe="nguy" onClick={onBamXoaHoacNgungHoatDong} disabled={dangXuLy}>
          {coTheXoaCung ? 'Xóa' : 'Ngừng hoạt động'}
        </Nut>
      )}
      <Nut bienThe="chinh" onClick={onBamSua} disabled={dangXuLy}>
        Chỉnh sửa
      </Nut>
    </footer>
  );
}

const NHAN_GHI_DE_QUAN_LY_LO: Record<GhiDeQuanLyLo, string> = {
  KE_THUA: 'Theo cài đặt chung',
  BAT: 'Quản lý theo lô',
  TAT: 'Không quản lý theo lô',
};

interface DieuKhienGhiDeQuanLyLoProps {
  ghiDe: GhiDeQuanLyLo;
  dangXuLy: boolean;
  loi: string | undefined;
  onDoi: (ghiDeMoi: GhiDeQuanLyLo) => void;
}

/**
 * Ghi đè cài đặt "quản lý theo lô" riêng cho một sản phẩm (T-010c). Ba lựa
 * chọn khớp `GhiDeQuanLyLo` — không phải công tắc hai trạng thái, vì "theo
 * cài đặt chung" (kế thừa) khác với "tắt tường minh" (SPEC.md §3.2). Đổi
 * BẬT→TẮT bị chặn khi sản phẩm còn hơn một lô tồn > 0 — lỗi hiện ngay dưới ô
 * chọn, không phải alert (dễ đọc lại, không chặn thao tác khác trên trang).
 */
export function DieuKhienGhiDeQuanLyLo({ ghiDe, dangXuLy, loi, onDoi }: DieuKhienGhiDeQuanLyLoProps) {
  return (
    <div className="thong-tin-hang-hoa__quan-ly-lo">
      <label htmlFor="ghi-de-quan-ly-lo" className="thong-tin-hang-hoa__quan-ly-lo-nhan">
        Quản lý theo lô
      </label>
      <select
        id="ghi-de-quan-ly-lo"
        value={ghiDe}
        disabled={dangXuLy}
        onChange={(su) => onDoi(su.target.value as GhiDeQuanLyLo)}
      >
        {(Object.keys(NHAN_GHI_DE_QUAN_LY_LO) as GhiDeQuanLyLo[]).map((gt) => (
          <option key={gt} value={gt}>
            {NHAN_GHI_DE_QUAN_LY_LO[gt]}
          </option>
        ))}
      </select>
      {loi ? <p className="thong-tin-hang-hoa__loi">{loi}</p> : null}
    </div>
  );
}

interface ChiTietHangHoaProps {
  id: string;
  /** Gọi lại sau khi sửa hoặc ngừng hoạt động thành công, để danh sách làm mới. */
  onDaSua?: () => void;
  /** Gọi lại sau khi xoá cứng thành công, để danh sách làm mới và đóng panel. */
  onDaXoa?: () => void;
}

export function ChiTietHangHoa({ id, onDaSua, onDaXoa }: ChiTietHangHoaProps) {
  const [chiTiet, setChiTiet] = useState<HangHoaChiTietRes | undefined>(undefined);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const [dangSua, setDangSua] = useState(false);
  const [dangXuLyXoa, setDangXuLyXoa] = useState(false);
  const [dangXuLyGhiDe, setDangXuLyGhiDe] = useState(false);
  const [loiGhiDe, setLoiGhiDe] = useState<string | undefined>(undefined);

  useEffect(() => {
    setChiTiet(undefined);
    setLoi(undefined);
    const controller = new AbortController();

    fetch(`/api/hang-hoa/${id}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setChiTiet(HangHoaChiTietResSchema.parse(json)))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoi('Không tải được chi tiết hàng hoá');
      });

    return () => controller.abort();
  }, [id]);

  function xoaHoacNgungHoatDong() {
    if (!chiTiet) return;
    const xacNhan = chiTiet.coTheXoaCung
      ? window.confirm(`Xoá hàng hoá "${chiTiet.ten}"? Không thể hoàn tác.`)
      : window.confirm(
          `Hàng hoá "${chiTiet.ten}" đã phát sinh thẻ kho nên không xoá cứng được — chuyển sang Ngừng hoạt động?`,
        );
    if (!xacNhan) return;

    setDangXuLyXoa(true);
    setLoi(undefined);

    if (chiTiet.coTheXoaCung) {
      fetch(`/api/hang-hoa/${id}`, { method: 'DELETE' })
        .then((res) => {
          if (!res.ok) throw new Error('Không xoá được hàng hoá');
          onDaXoa?.();
        })
        .catch((err: unknown) => {
          setDangXuLyXoa(false);
          setLoi(err instanceof Error ? err.message : 'Không xoá được hàng hoá');
        });
      return;
    }

    fetch(`/api/hang-hoa/${id}/ngung-hoat-dong`, { method: 'POST' })
      .then(async (res) => {
        const json: unknown = await res.json();
        if (!res.ok) {
          const thongBao = (json as { loi?: string } | undefined)?.loi;
          throw new Error(thongBao ?? 'Không ngừng hoạt động được hàng hoá');
        }
        setChiTiet(HangHoaChiTietResSchema.parse(json));
        setDangXuLyXoa(false);
        onDaSua?.();
      })
      .catch((err: unknown) => {
        setDangXuLyXoa(false);
        setLoi(err instanceof Error ? err.message : 'Không ngừng hoạt động được hàng hoá');
      });
  }

  function doiGhiDeQuanLyLo(ghiDeMoi: GhiDeQuanLyLo) {
    if (!chiTiet) return;
    setDangXuLyGhiDe(true);
    setLoiGhiDe(undefined);

    fetch(`/api/hang-hoa/${id}/quan-ly-lo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ghiDe: ghiDeMoi }),
    })
      .then(async (res) => {
        const json: unknown = await res.json();
        if (!res.ok) {
          const thongBao = (json as { loi?: string } | undefined)?.loi;
          throw new Error(thongBao ?? 'Không đổi được cài đặt quản lý theo lô');
        }
        setChiTiet(HangHoaChiTietResSchema.parse(json));
        setDangXuLyGhiDe(false);
        onDaSua?.();
      })
      .catch((err: unknown) => {
        setDangXuLyGhiDe(false);
        setLoiGhiDe(err instanceof Error ? err.message : 'Không đổi được cài đặt quản lý theo lô');
      });
  }

  if (loi) return <p className="thong-tin-hang-hoa__loi">{loi}</p>;
  if (!chiTiet) return <p>Đang tải…</p>;

  return (
    <>
      <ThongTinHangHoa chiTiet={chiTiet} />
      <DieuKhienGhiDeQuanLyLo
        ghiDe={chiTiet.quanLyLoGhiDe}
        dangXuLy={dangXuLyGhiDe}
        loi={loiGhiDe}
        onDoi={doiGhiDeQuanLyLo}
      />
      <ChanHangHoa
        trangThai={chiTiet.trangThai}
        coTheXoaCung={chiTiet.coTheXoaCung}
        dangXuLy={dangXuLyXoa}
        onBamSua={() => setDangSua(true)}
        onBamXoaHoacNgungHoatDong={xoaHoacNgungHoatDong}
      />
      {dangSua ? (
        <SuaHangHoa
          chiTiet={chiTiet}
          onHuy={() => setDangSua(false)}
          onSuaXong={(ct) => {
            setDangSua(false);
            setChiTiet(ct);
            onDaSua?.();
          }}
        />
      ) : null}
    </>
  );
}
