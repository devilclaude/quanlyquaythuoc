import { useEffect, useState } from 'react';
import {
  HangHoaChiTietResSchema,
  type DonViTinhRes,
  type HangHoaChiTietRes,
} from '../../../shared/hop-dong/hang-hoa';
import { dong } from '../../../shared/kieu/dong';
import { soLuongCoSo } from '../../../shared/kieu/so-luong';
import { hienThiGanDung } from '../../../shared/don-vi/quy-doi';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang } from '../../thanh-phan';
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

export function ChiTietHangHoa({ id }: { id: string }) {
  const [chiTiet, setChiTiet] = useState<HangHoaChiTietRes | undefined>(undefined);
  const [loi, setLoi] = useState<string | undefined>(undefined);

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

  if (loi) return <p className="thong-tin-hang-hoa__loi">{loi}</p>;
  if (!chiTiet) return <p>Đang tải…</p>;
  return <ThongTinHangHoa chiTiet={chiTiet} />;
}
