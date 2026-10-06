import { useEffect, useState } from 'react';
import { PhieuNhapDeTraHangNhapResSchema, type PhieuNhapDeTraHangNhapRes } from '../../../shared/hop-dong/tra-hang-nhap';
import { Bang, OSo } from '../../thanh-phan';
import './TraCuuPhieuNhap.css';

// T-053c2 — tra một phiếu nhập theo mã để bắt đầu luồng tạo trả hàng nhập,
// cùng khuôn `TraCuuHoaDon.tsx` (T-052c/d). `BangDongPhieuNhapDeTraHangNhap`
// CHỈ ĐỌC khi gọi không kèm `onSuaSoLuongTra`; `TaoTraHangNhap` (luồng tạo)
// truyền thêm `soLuongTra`/`onSuaSoLuongTra` để bảng tự thêm cột nhập số
// lượng trả — không viết lại bảng.

/** Tra một phiếu nhập theo mã — `undefined` khi chưa có mã để tra. */
export function usePhieuNhapDeTraHangNhap(ma: string | undefined) {
  const [duLieu, setDuLieu] = useState<PhieuNhapDeTraHangNhapRes | undefined>(undefined);
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

    fetch(`/api/tra-hang-nhap/phieu-nhap/${encodeURIComponent(ma)}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) throw new Error('KHONG_TIM_THAY');
        return res.json();
      })
      .then((json) => {
        setDuLieu(PhieuNhapDeTraHangNhapResSchema.parse(json));
        setDangTai(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoi(err instanceof Error && err.message === 'KHONG_TIM_THAY' ? `Không tìm thấy phiếu nhập "${ma}"` : 'Không tra được phiếu nhập');
        setDangTai(false);
      });

    return () => controller.abort();
  }, [ma]);

  return { duLieu, dangTai, loi };
}

interface BangDongPhieuNhapDeTraHangNhapProps {
  dong: PhieuNhapDeTraHangNhapRes['dong'];
  /** Chỉ cho khi muốn cho sửa (T-053c2) — map `phieuNhapDongId -> số lượng trả` đã chọn. */
  soLuongTra?: Record<string, number>;
  /** Có mặt thì bảng thêm cột "Số lượng trả" kèm ô nhập; vắng mặt thì chỉ đọc (T-053c1). */
  onSuaSoLuongTra?: (phieuNhapDongId: string, soLuongMoi: number) => void;
}

/** Thuần theo props — bảng dòng của một phiếu nhập (xem ghi chú đầu file). */
export function BangDongPhieuNhapDeTraHangNhap({ dong, soLuongTra, onSuaSoLuongTra }: BangDongPhieuNhapDeTraHangNhapProps) {
  const choSua = onSuaSoLuongTra !== undefined;
  return (
    <Bang>
      <thead>
        <tr>
          <th>Mã hàng</th>
          <th>Tên hàng</th>
          <th>Đã nhập</th>
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
            <OSo>{d.soLuongDaNhap}</OSo>
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
