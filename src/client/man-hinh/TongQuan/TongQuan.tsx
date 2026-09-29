import { useEffect, useState } from 'react';
import { CanhBaoLechKhoResSchema, type CanhBaoLechKho } from '../../../shared/hop-dong/tong-quan';
import { BadgeTrangThai, Bang, OSo } from '../../thanh-phan';
import './TongQuan.css';

interface TrangThaiTongQuan {
  canhBao: CanhBaoLechKho[];
  loi: string | undefined;
}

interface KhoiCanhBaoLechKhoProps {
  trangThai: TrangThaiTongQuan;
}

/**
 * Phần hiển thị thuần (tách khỏi container để test bằng `renderToStaticMarkup`
 * mà không cần mock `fetch` — cùng khuôn với `KhoiCaiDatToanCuc`).
 */
export function KhoiCanhBaoLechKho({ trangThai }: KhoiCanhBaoLechKhoProps) {
  return (
    <section className="tong-quan__khoi">
      <h2 className="tong-quan__tieu-de">Cảnh báo lệch kho</h2>
      {trangThai.loi ? <p className="tong-quan__loi">{trangThai.loi}</p> : null}
      {!trangThai.loi && trangThai.canhBao.length === 0 ? (
        <p className="tong-quan__rong">Không có cảnh báo lệch kho.</p>
      ) : null}
      {trangThai.canhBao.length > 0 ? (
        <>
          <p className="tong-quan__mo-ta">
            Các lô dưới đây đang có tồn kho âm — thường do hai thiết bị cùng bán khi mất mạng. Máy chủ vẫn nhận
            đơn, không tự sửa số liệu; cần kiểm kê lô tương ứng để đưa tồn về đúng.
          </p>
          <Bang>
            <thead>
              <tr>
                <th>Mã hàng</th>
                <th>Tên hàng</th>
                <th>Số lô</th>
                <th>Hạn dùng</th>
                <th>Tồn</th>
              </tr>
            </thead>
            <tbody>
              {trangThai.canhBao.map((cb) => (
                <tr key={cb.loId}>
                  <td>{cb.maHang}</td>
                  <td>{cb.tenSanPham}</td>
                  <td>{cb.soLo ?? '—'}</td>
                  <td>{cb.hsd ?? '—'}</td>
                  <OSo>
                    <BadgeTrangThai mau="nguy">{cb.ton}</BadgeTrangThai>
                  </OSo>
                </tr>
              ))}
            </tbody>
          </Bang>
        </>
      ) : null}
    </section>
  );
}

/**
 * Màn Tổng quan (T-034) — chưa có screenshot KiotViet tham chiếu cho màn này
 * trong `docs/reference/kiotviet/` (theo tiền lệ T-010c/T-023), dựng theo token
 * trong `.claude/skills/design-system/`. Ở lần này chỉ có một khối: cảnh báo
 * lệch kho (SPEC.md §4.4). T-055 (cảnh báo cận date) sẽ thêm khối thứ hai sau.
 */
export function TongQuan() {
  const [trangThai, setTrangThai] = useState<TrangThaiTongQuan | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/tong-quan/canh-bao-lech-kho', { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setTrangThai({ canhBao: CanhBaoLechKhoResSchema.parse(json).canhBao, loi: undefined }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setTrangThai({ canhBao: [], loi: 'Không tải được cảnh báo lệch kho' });
      });

    return () => controller.abort();
  }, []);

  if (!trangThai) return <p>Đang tải…</p>;

  return <KhoiCanhBaoLechKho trangThai={trangThai} />;
}
