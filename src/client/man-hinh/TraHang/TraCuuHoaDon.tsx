import { useEffect, useState } from 'react';
import { HoaDonDeTraHangResSchema, type HoaDonDeTraHangRes } from '../../../shared/hop-dong/tra-hang';
import { Bang, OSo } from '../../thanh-phan';
import './TraCuuHoaDon.css';

// T-052c — tra một hoá đơn theo mã để XEM LẠI từ chi tiết một phiếu trả đã
// tạo (liên kết ngược — chỉ chiều phiếu trả → hoá đơn; chiều ngược lại cần
// một màn "Danh sách hoá đơn" chưa có trong BACKLOG.md, xem ghi chú PR).
// `BangDongHoaDonDeTraHang` CHỈ ĐỌC ở task này — T-052d (luồng tạo, chẻ khỏi
// task này vì vượt ngưỡng 1000 dòng/PR, xem BACKLOG.md) sẽ dùng lại
// `useHoaDonDeTraHang`/route `GET /api/tra-hang/hoa-don/:ma` và THÊM cột nhập
// số lượng trả — không viết lại phần tra cứu này.

/** Tra một hoá đơn theo mã — `undefined` khi chưa có mã để tra. */
export function useHoaDonDeTraHang(ma: string | undefined) {
  const [duLieu, setDuLieu] = useState<HoaDonDeTraHangRes | undefined>(undefined);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | undefined>(undefined);

  useEffect(() => {
    setDuLieu(undefined);
    setLoi(undefined);
    if (!ma) {
      setDangTai(false);
      return;
    }
    const controller = new AbortController();
    setDangTai(true);

    fetch(`/api/tra-hang/hoa-don/${encodeURIComponent(ma)}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) throw new Error('KHONG_TIM_THAY');
        return res.json();
      })
      .then((json) => {
        setDuLieu(HoaDonDeTraHangResSchema.parse(json));
        setDangTai(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoi(err instanceof Error && err.message === 'KHONG_TIM_THAY' ? `Không tìm thấy hoá đơn "${ma}"` : 'Không tra được hoá đơn');
        setDangTai(false);
      });

    return () => controller.abort();
  }, [ma]);

  return { duLieu, dangTai, loi };
}

/** Thuần theo props — bảng dòng CHỈ ĐỌC của một hoá đơn (xem ghi chú đầu file). */
export function BangDongHoaDonDeTraHang({ dong }: { dong: HoaDonDeTraHangRes['dong'] }) {
  return (
    <Bang>
      <thead>
        <tr>
          <th>Mã hàng</th>
          <th>Tên hàng</th>
          <th>Đã bán</th>
          <th>Còn trả được</th>
        </tr>
      </thead>
      <tbody>
        {dong.map((d) => (
          <tr key={d.id}>
            <td>{d.maHang}</td>
            <td>
              {d.ten} ({d.donViTen})
            </td>
            <OSo>{d.soLuongDaBan}</OSo>
            <OSo>{d.conLaiToiDa}</OSo>
          </tr>
        ))}
      </tbody>
    </Bang>
  );
}
