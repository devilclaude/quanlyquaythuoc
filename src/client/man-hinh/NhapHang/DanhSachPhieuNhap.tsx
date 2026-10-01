import type { ReactNode } from 'react';
import { Fragment, useEffect, useState } from 'react';
import {
  DanhSachPhieuNhapResSchema,
  type PhieuNhapDanhSachItem,
  type TrangThaiPhieuNhap,
} from '../../../shared/hop-dong/phieu-nhap';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangThoiGianVN } from '../../../shared/thoi-gian/dinh-dang';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, BadgeTrangThai, Nut, OSo, TruongNhap } from '../../thanh-phan';
import { ChiTietPhieuNhap } from './ChiTietPhieuNhap';
import { NhapHang } from './NhapHang';
import { MAU_BADGE_TRANG_THAI, nhanTrangThaiPhieuNhap } from './trang-thai-phieu-nhap';
import './DanhSachPhieuNhap.css';

// T-041 — Danh sách và chi tiết phiếu nhập. Cột/bộ lọc khớp screenshot "Danh
// sách nhập hàng". Không có cột "Mã NCC"/"Nhà cung cấp"/"Cần trả NCC" (công nợ
// NCC ngoài v1 — SPEC.md §2) — thay "Cần trả NCC" bằng "Tổng tiền" (giá trị
// phiếu, không phải công nợ). Không có trạng thái "Đã hủy" (chưa có luồng huỷ
// phiếu nhập trong BACKLOG.md) và không có bộ lọc "Người tạo"/"Người nhập"
// (quầy chỉ có một người dùng — v1.1 danh sách trong BACKLOG.md). Bộ lọc
// "Thời gian" (Tháng này/Tùy chỉnh) của ảnh gốc CHẺ SANG T-041b — slice này
// vượt ngưỡng 1000 dòng/PR nếu gộp chung (xem BACKLOG.md T-041b).

const CAC_TRANG_THAI: readonly TrangThaiPhieuNhap[] = ['PHIEU_TAM', 'HOAN_THANH'];

interface XayDungTruyVanInput {
  tim: string;
  trangThaiDaChon: readonly TrangThaiPhieuNhap[];
}

/** Chỉ gửi `trangThai` khi đã LỌC BỚT (chọn ít hơn toàn bộ) — chọn đủ cả hai cũng như không lọc. */
export function xayDungTruyVanDanhSachPhieuNhap({ tim, trangThaiDaChon }: XayDungTruyVanInput): string {
  const phan = new URLSearchParams();
  if (tim.trim()) phan.set('tim', tim.trim());
  if (trangThaiDaChon.length > 0 && trangThaiDaChon.length < CAC_TRANG_THAI.length) {
    for (const t of trangThaiDaChon) phan.append('trangThai', t);
  }
  return phan.toString();
}

interface BangDanhSachPhieuNhapProps {
  duLieu: PhieuNhapDanhSachItem[];
  dangTai: boolean;
  loi: string | undefined;
  phieuChonId: string | undefined;
  onChonDong: (id: string) => void;
  renderChiTiet: (id: string) => ReactNode;
}

/** Thuần theo props — dựng riêng để test không phải đợi fetch thật. */
export function BangDanhSachPhieuNhap({
  duLieu,
  dangTai,
  loi,
  phieuChonId,
  onChonDong,
  renderChiTiet,
}: BangDanhSachPhieuNhapProps) {
  return (
    <Bang>
      <thead>
        <tr>
          <th>Mã nhập hàng</th>
          <th>Thời gian</th>
          <th>Tổng tiền</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {loi ? (
          <tr>
            <td colSpan={4} className="danh-sach-phieu-nhap__thong-bao danh-sach-phieu-nhap__thong-bao--loi">
              {loi}
            </td>
          </tr>
        ) : dangTai ? (
          <tr>
            <td colSpan={4} className="danh-sach-phieu-nhap__thong-bao">
              Đang tải…
            </td>
          </tr>
        ) : duLieu.length === 0 ? (
          <tr>
            <td colSpan={4} className="danh-sach-phieu-nhap__thong-bao">
              Không có phiếu nhập nào khớp bộ lọc
            </td>
          </tr>
        ) : (
          duLieu.map((p) => (
            <Fragment key={p.id}>
              <tr
                tabIndex={0}
                role="button"
                aria-expanded={phieuChonId === p.id}
                className={phieuChonId === p.id ? 'danh-sach-phieu-nhap__dong--dang-chon' : undefined}
                onClick={() => onChonDong(p.id)}
                onKeyDown={(su) => {
                  if (su.key === 'Enter') onChonDong(p.id);
                }}
              >
                <td>{p.ma}</td>
                <td>{dinhDangThoiGianVN(p.thoiGian)}</td>
                <OSo>{dinhDangTien(dong(p.tongTien))}</OSo>
                <td>
                  <BadgeTrangThai mau={MAU_BADGE_TRANG_THAI[p.trangThai]}>
                    {nhanTrangThaiPhieuNhap(p.trangThai)}
                  </BadgeTrangThai>
                </td>
              </tr>
              {phieuChonId === p.id ? (
                <tr>
                  <td colSpan={4} className="danh-sach-phieu-nhap__chi-tiet">
                    {renderChiTiet(p.id)}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))
        )}
      </tbody>
    </Bang>
  );
}

/** Container: bộ lọc trạng thái + ô tìm theo mã + "+ Nhập hàng". */
export function DanhSachPhieuNhap() {
  const [tim, setTim] = useState('');
  const [trangThaiLoc, setTrangThaiLoc] = useState<Record<TrangThaiPhieuNhap, boolean>>({
    PHIEU_TAM: true,
    HOAN_THANH: true,
  });
  const [duLieu, setDuLieu] = useState<PhieuNhapDanhSachItem[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const [phieuChonId, setPhieuChonId] = useState<string | undefined>(undefined);
  const [phienBanLamMoi, setPhienBanLamMoi] = useState(0);
  const [dangTaoMoi, setDangTaoMoi] = useState(false);

  const trangThaiDaChon = CAC_TRANG_THAI.filter((t) => trangThaiLoc[t]);

  useEffect(() => {
    if (trangThaiDaChon.length === 0) {
      setDuLieu([]);
      setDangTai(false);
      setLoi(undefined);
      return;
    }

    const dinhThoiGian = setTimeout(() => {
      const controller = new AbortController();
      setDangTai(true);
      setLoi(undefined);

      const qs = xayDungTruyVanDanhSachPhieuNhap({ tim, trangThaiDaChon });
      fetch(`/api/phieu-nhap?${qs}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => {
          setDuLieu(DanhSachPhieuNhapResSchema.parse(json).duLieu);
          setDangTai(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setLoi('Không tải được danh sách phiếu nhập');
          setDangTai(false);
        });

      return () => controller.abort();
    }, 250);

    return () => clearTimeout(dinhThoiGian);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tim, trangThaiLoc, phienBanLamMoi]);

  if (dangTaoMoi) {
    return (
      <div className="danh-sach-phieu-nhap">
        <button
          type="button"
          className="danh-sach-phieu-nhap__quay-lai"
          onClick={() => {
            setDangTaoMoi(false);
            setPhienBanLamMoi((v) => v + 1);
          }}
        >
          ← Danh sách nhập hàng
        </button>
        <NhapHang />
      </div>
    );
  }

  return (
    <div className="danh-sach-phieu-nhap">
      <aside className="danh-sach-phieu-nhap__bo-loc">
        <h2>Trạng thái</h2>
        {CAC_TRANG_THAI.map((t) => (
          <label key={t} className="danh-sach-phieu-nhap__nhan-checkbox">
            <input
              type="checkbox"
              checked={trangThaiLoc[t]}
              onChange={(su) => setTrangThaiLoc((v) => ({ ...v, [t]: su.target.checked }))}
            />
            {nhanTrangThaiPhieuNhap(t)}
          </label>
        ))}
      </aside>

      <section className="danh-sach-phieu-nhap__noi-dung">
        <h1 className="danh-sach-phieu-nhap__tieu-de">Nhập hàng</h1>
        <div className="danh-sach-phieu-nhap__thanh-cong-cu">
          <TruongNhap
            aria-label="Tìm theo mã phiếu nhập"
            placeholder="Theo mã phiếu nhập"
            value={tim}
            onChange={(su) => setTim(su.target.value)}
          />
          <Nut bienThe="chinh" onClick={() => setDangTaoMoi(true)}>
            + Nhập hàng
          </Nut>
        </div>
        <BangDanhSachPhieuNhap
          duLieu={duLieu}
          dangTai={dangTai}
          loi={loi}
          phieuChonId={phieuChonId}
          onChonDong={(id) => setPhieuChonId((hienTai) => (hienTai === id ? undefined : id))}
          renderChiTiet={(id) => <ChiTietPhieuNhap id={id} />}
        />
      </section>
    </div>
  );
}
