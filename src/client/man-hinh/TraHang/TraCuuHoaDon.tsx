import { useEffect, useState } from 'react';
import { HoaDonDeTraHangResSchema, type HoaDonDeTraHangRes } from '../../../shared/hop-dong/tra-hang';
import { Bang, OSo } from '../../thanh-phan';
import './TraCuuHoaDon.css';

// T-052c — tra một hoá đơn theo mã để XEM LẠI từ chi tiết một phiếu trả đã
// tạo (liên kết ngược — chỉ chiều phiếu trả → hoá đơn; chiều ngược lại cần
// một màn "Danh sách hoá đơn" chưa có trong BACKLOG.md, xem ghi chú PR).
// `BangDongHoaDonDeTraHang` CHỈ ĐỌC khi gọi không kèm `onSuaSoLuongTra` (dùng ở
// `ChiTietTraHang`, T-052c). T-052d (luồng tạo) truyền thêm `soLuongTra`/
// `onSuaSoLuongTra` để bảng tự thêm cột nhập số lượng trả — không viết lại
// bảng hay `useHoaDonDeTraHang`/route `GET /api/tra-hang/hoa-don/:ma`.

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

interface BangDongHoaDonDeTraHangProps {
  dong: HoaDonDeTraHangRes['dong'];
  /** Chỉ cho khi muốn cho sửa (T-052d) — map `hoaDonDongId -> số lượng trả` đã chọn. */
  soLuongTra?: Record<string, number>;
  /** Có mặt thì bảng thêm cột "Số lượng trả" kèm ô nhập; vắng mặt thì chỉ đọc (T-052c). */
  onSuaSoLuongTra?: (hoaDonDongId: string, soLuongMoi: number) => void;
}

/** Thuần theo props — bảng dòng của một hoá đơn (xem ghi chú đầu file). */
export function BangDongHoaDonDeTraHang({ dong, soLuongTra, onSuaSoLuongTra }: BangDongHoaDonDeTraHangProps) {
  const choSua = onSuaSoLuongTra !== undefined;
  return (
    <Bang>
      <thead>
        <tr>
          <th>Mã hàng</th>
          <th>Tên hàng</th>
          <th>Đã bán</th>
          <th>Còn trả được</th>
          {choSua ? <th>Số lượng trả</th> : null}
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
            {choSua ? (
              <OSo>
                <input
                  type="number"
                  min={0}
                  max={d.conLaiToiDa}
                  step={1}
                  aria-label={`Số lượng trả ${d.ten}`}
                  value={soLuongTra?.[d.id] ?? 0}
                  onChange={(su) => onSuaSoLuongTra?.(d.id, Number.parseInt(su.target.value, 10))}
                />
              </OSo>
            ) : null}
          </tr>
        ))}
      </tbody>
    </Bang>
  );
}
