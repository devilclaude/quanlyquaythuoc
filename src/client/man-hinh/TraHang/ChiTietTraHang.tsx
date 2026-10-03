import { useEffect, useState } from 'react';
import { TraHangChiTietResSchema, type TraHangChiTietRes } from '../../../shared/hop-dong/tra-hang';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, OSo } from '../../thanh-phan';
import { BangDongHoaDonDeTraHang, useHoaDonDeTraHang } from './TraCuuHoaDon';
import './ChiTietTraHang.css';

/**
 * Chi tiết CHỈ ĐỌC (T-052c): Mã trả hàng, mã hoá đơn gốc (liên kết ngược —
 * bấm mở lại hoá đơn NGAY TẠI ĐÂY, xem `TraCuuHoaDon`), bảng dòng Mã hàng/Tên
 * hàng/Số lượng/Tiền hoàn. Không có "Người bán"/"Khách hàng"/"Mã KH" (quầy một
 * người dùng, không công nợ khách — v1.1, giống tiền lệ T-041 với "Nhà cung
 * cấp"/"Người tạo").
 */
export function ThongTinTraHang({ chiTiet }: { chiTiet: TraHangChiTietRes }) {
  const [xemHoaDon, setXemHoaDon] = useState(false);
  const { duLieu: hoaDon, dangTai, loi } = useHoaDonDeTraHang(xemHoaDon ? chiTiet.hoaDonMa : undefined);

  return (
    <div className="thong-tin-tra-hang">
      <div className="thong-tin-tra-hang__dau">
        <h2 className="thong-tin-tra-hang__ma">{chiTiet.ma}</h2>
        <span className="thong-tin-tra-hang__hoa-don">
          Mã hoá đơn:{' '}
          <button type="button" className="thong-tin-tra-hang__nut-hoa-don" onClick={() => setXemHoaDon((v) => !v)}>
            {chiTiet.hoaDonMa}
          </button>
        </span>
      </div>

      {xemHoaDon ? (
        <div className="thong-tin-tra-hang__hoa-don-goc">
          {dangTai ? <p>Đang tải…</p> : null}
          {loi ? <p className="tra-cuu-hoa-don__loi">{loi}</p> : null}
          {hoaDon ? <BangDongHoaDonDeTraHang dong={hoaDon.dong} /> : null}
        </div>
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

      <dl className="thong-tin-tra-hang__tong">
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

interface ChiTietTraHangProps {
  id: string;
}

export function ChiTietTraHang({ id }: ChiTietTraHangProps) {
  const [chiTiet, setChiTiet] = useState<TraHangChiTietRes | undefined>(undefined);
  const [loi, setLoi] = useState<string | undefined>(undefined);

  useEffect(() => {
    setChiTiet(undefined);
    setLoi(undefined);
    const controller = new AbortController();

    fetch(`/api/tra-hang/${id}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setChiTiet(TraHangChiTietResSchema.parse(json)))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoi('Không tải được chi tiết phiếu trả hàng');
      });

    return () => controller.abort();
  }, [id]);

  if (loi) return <p className="thong-tin-tra-hang__loi">{loi}</p>;
  if (!chiTiet) return <p>Đang tải…</p>;

  return <ThongTinTraHang chiTiet={chiTiet} />;
}
