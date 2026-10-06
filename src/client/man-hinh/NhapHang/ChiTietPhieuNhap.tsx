import { useEffect, useState } from 'react';
import { PhieuNhapChiTietResSchema, type PhieuNhapChiTietRes } from '../../../shared/hop-dong/phieu-nhap';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, BadgeTrangThai, Nut, OSo } from '../../thanh-phan';
import { MAU_BADGE_TRANG_THAI, nhanTrangThaiPhieuNhap } from './trang-thai-phieu-nhap';
import './ChiTietPhieuNhap.css';

/**
 * Chi tiết CHỈ ĐỌC (T-041) — khớp bảng dòng trong ảnh "Chi tiết một đơn nhập
 * hàng trong danh sách": Mã hàng, Tên hàng, Số lượng, Đơn giá, Thành tiền.
 * Không có cột "Giảm giá" (không có trường tương ứng — cùng quyết định với
 * T-040c1). Không có "Tên NCC"/"Cần trả NCC"/"Tiền đã trả NCC" (công nợ NCC
 * ngoài v1). Không có các nút Huỷ/Sao chép/Xuất file/Mở phiếu/Lưu/In tem mã ở
 * chân phiếu — ngoài phạm vi "Xong khi" T-041 (xem PR).
 *
 * `onTraHangNhap` (T-053c2) — liên kết ngược CHIỀU CÒN LẠI (phiếu nhập → trả
 * hàng nhập): có mặt VÀ phiếu đã `HOAN_THANH` thì hiện nút "Trả hàng nhập" ở
 * chân phiếu (khớp vị trí ảnh "Chi tiết một đơn nhập hàng trong danh sách").
 * Vắng mặt (vd. khi `ChiTietPhieuNhap` được tái dùng làm "phiếu nhập gốc" bên
 * trong chi tiết trả hàng nhập, T-053c1) thì không hiện — tránh đệ quy liên
 * kết ngược vô hạn.
 */
export function ThongTinPhieuNhap({
  chiTiet,
  onTraHangNhap,
}: {
  chiTiet: PhieuNhapChiTietRes;
  onTraHangNhap?: ((phieuNhapMa: string) => void) | undefined;
}) {
  const hienCotLo = chiTiet.dong.some((d) => d.soLo !== null);

  return (
    <div className="thong-tin-phieu-nhap">
      <div className="thong-tin-phieu-nhap__dau">
        <h2 className="thong-tin-phieu-nhap__ma">{chiTiet.ma}</h2>
        <BadgeTrangThai mau={MAU_BADGE_TRANG_THAI[chiTiet.trangThai]}>
          {nhanTrangThaiPhieuNhap(chiTiet.trangThai)}
        </BadgeTrangThai>
      </div>

      <Bang>
        <thead>
          <tr>
            <th>Mã hàng</th>
            <th>Tên hàng</th>
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
          {chiTiet.dong.map((d) => (
            <tr key={d.id}>
              <td>{d.maHang}</td>
              <td>
                {d.ten} ({d.donViTen})
              </td>
              <OSo>{d.soLuong}</OSo>
              <OSo>{dinhDangTien(dong(d.donGia))}</OSo>
              {hienCotLo ? (
                <>
                  <td>{d.soLo ?? '—'}</td>
                  <td>{d.hsd ?? '—'}</td>
                </>
              ) : null}
              <OSo>{dinhDangTien(dong(d.donGia * d.soLuong))}</OSo>
            </tr>
          ))}
        </tbody>
      </Bang>

      <dl className="thong-tin-phieu-nhap__tong">
        <div>
          <dt>Số lượng mặt hàng</dt>
          <dd>{chiTiet.dong.length}</dd>
        </div>
        <div>
          <dt>Tổng tiền hàng</dt>
          <dd>{dinhDangTien(dong(chiTiet.tongTien))}</dd>
        </div>
      </dl>

      {onTraHangNhap && chiTiet.trangThai === 'HOAN_THANH' ? (
        <Nut bienThe="phu" onClick={() => onTraHangNhap(chiTiet.ma)}>
          Trả hàng nhập
        </Nut>
      ) : null}
    </div>
  );
}

interface ChiTietPhieuNhapProps {
  id: string;
  onTraHangNhap?: ((phieuNhapMa: string) => void) | undefined;
}

export function ChiTietPhieuNhap({ id, onTraHangNhap }: ChiTietPhieuNhapProps) {
  const [chiTiet, setChiTiet] = useState<PhieuNhapChiTietRes | undefined>(undefined);
  const [loi, setLoi] = useState<string | undefined>(undefined);

  useEffect(() => {
    setChiTiet(undefined);
    setLoi(undefined);
    const controller = new AbortController();

    fetch(`/api/phieu-nhap/${id}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setChiTiet(PhieuNhapChiTietResSchema.parse(json)))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoi('Không tải được chi tiết phiếu nhập');
      });

    return () => controller.abort();
  }, [id]);

  if (loi) return <p className="thong-tin-phieu-nhap__loi">{loi}</p>;
  if (!chiTiet) return <p>Đang tải…</p>;

  return <ThongTinPhieuNhap chiTiet={chiTiet} onTraHangNhap={onTraHangNhap} />;
}
