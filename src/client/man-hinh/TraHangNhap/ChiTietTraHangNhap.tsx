import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { TraHangNhapChiTietResSchema, type TraHangNhapChiTietRes } from '../../../shared/hop-dong/tra-hang-nhap';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, BadgeTrangThai, OSo } from '../../thanh-phan';
import './ChiTietTraHangNhap.css';

/**
 * Chi tiết CHỈ ĐỌC (T-053c, cùng khuôn `ThongTinTraHang`/T-052c): Mã trả
 * hàng nhập, badge trạng thái, mã phiếu nhập gốc (liên kết ngược — bấm mở lại
 * phiếu nhập NGAY TẠI ĐÂY), bảng dòng Mã hàng/Tên hàng/Số lượng/Tiền hoàn.
 * Badge luôn "Đã trả" (`tot`, tĩnh — không có trường `trạng thái` trong schema
 * `tra_hang_nhap`): một phiếu trả hàng nhập luôn hoàn tất ngay trong một
 * transaction (T-053a), không có khái niệm "phiếu tạm" như `phieu_nhap`.
 *
 * `renderPhieuNhapGoc` là render-prop thay vì import thẳng `ChiTietPhieuNhap`
 * (NhapHang) — để file này (và container `ChiTietTraHangNhap` dưới đây) không
 * import module NhapHang trực tiếp; `DanhSachTraHangNhap.tsx` mới là nơi nối
 * `ChiTietPhieuNhap` thật vào qua prop này (tránh import vòng với chiều ngược
 * lại: nút "Trả hàng nhập" ở `ChiTietPhieuNhap`, xem ghi chú ở đó).
 */
export function ThongTinTraHangNhap({
  chiTiet,
  renderPhieuNhapGoc,
}: {
  chiTiet: TraHangNhapChiTietRes;
  renderPhieuNhapGoc?: ((phieuNhapId: string) => ReactNode) | undefined;
}) {
  const [xemPhieuNhap, setXemPhieuNhap] = useState(false);

  return (
    <div className="thong-tin-tra-hang-nhap">
      <div className="thong-tin-tra-hang-nhap__dau">
        <h2 className="thong-tin-tra-hang-nhap__ma">{chiTiet.ma}</h2>
        <BadgeTrangThai mau="tot">Đã trả hàng</BadgeTrangThai>
        <span className="thong-tin-tra-hang-nhap__phieu-nhap">
          Mã nhập hàng:{' '}
          {renderPhieuNhapGoc ? (
            <button type="button" className="thong-tin-tra-hang-nhap__nut-phieu-nhap" onClick={() => setXemPhieuNhap((v) => !v)}>
              {chiTiet.phieuNhapMa}
            </button>
          ) : (
            chiTiet.phieuNhapMa
          )}
        </span>
      </div>

      {xemPhieuNhap && renderPhieuNhapGoc ? (
        <div className="thong-tin-tra-hang-nhap__phieu-nhap-goc">{renderPhieuNhapGoc(chiTiet.phieuNhapId)}</div>
      ) : null}

      <Bang>
        <thead>
          <tr>
            <th>Mã hàng</th>
            <th>Tên hàng</th>
            <th>Số lượng</th>
            <th>Tiền hoàn</th>
          </tr>
        </thead>
        <tbody>
          {chiTiet.dong.map((d) => (
            <tr key={d.id}>
              <td>{d.maHang}</td>
              <td>{d.ten}</td>
              <OSo>{d.soLuong}</OSo>
              <OSo>{dinhDangTien(dong(d.tienHoan))}</OSo>
            </tr>
          ))}
        </tbody>
      </Bang>

      <dl className="thong-tin-tra-hang-nhap__tong">
        <div>
          <dt>Số lượng mặt hàng</dt>
          <dd>{chiTiet.dong.length}</dd>
        </div>
        <div>
          <dt>Tổng tiền hoàn</dt>
          <dd>{dinhDangTien(dong(chiTiet.tongTienHoan))}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Tra một phiếu trả hàng nhập theo id — dùng chung giữa chi tiết (dưới đây) và liên kết ngược từ `ChiTietPhieuNhap`. */
export function useTraHangNhapChiTiet(id: string | undefined) {
  const [chiTiet, setChiTiet] = useState<TraHangNhapChiTietRes | undefined>(undefined);
  const [loi, setLoi] = useState<string | undefined>(undefined);

  useEffect(() => {
    setChiTiet(undefined);
    setLoi(undefined);
    if (!id) return;
    const controller = new AbortController();

    fetch(`/api/tra-hang-nhap/${id}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setChiTiet(TraHangNhapChiTietResSchema.parse(json)))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoi('Không tải được chi tiết phiếu trả hàng nhập');
      });

    return () => controller.abort();
  }, [id]);

  return { chiTiet, loi };
}

interface ChiTietTraHangNhapProps {
  id: string;
  renderPhieuNhapGoc?: ((phieuNhapId: string) => ReactNode) | undefined;
}

export function ChiTietTraHangNhap({ id, renderPhieuNhapGoc }: ChiTietTraHangNhapProps) {
  const { chiTiet, loi } = useTraHangNhapChiTiet(id);

  if (loi) return <p className="thong-tin-tra-hang-nhap__loi">{loi}</p>;
  if (!chiTiet) return <p>Đang tải…</p>;

  return <ThongTinTraHangNhap chiTiet={chiTiet} renderPhieuNhapGoc={renderPhieuNhapGoc} />;
}
