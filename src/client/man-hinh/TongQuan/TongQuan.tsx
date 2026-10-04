import { useEffect, useState } from 'react';
import {
  CanhBaoCanDateResSchema,
  CanhBaoLechKhoResSchema,
  type CanhBaoCanDate,
  type CanhBaoLechKho,
} from '../../../shared/hop-dong/tong-quan';
import { BadgeTrangThai, Bang, OSo, type MauBadge } from '../../thanh-phan';
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

interface TrangThaiCanDate {
  canhBao: CanhBaoCanDate[];
  loi: string | undefined;
}

interface KhoiCanhBaoCanDateProps {
  trangThai: TrangThaiCanDate;
}

const MAU_THEO_NGUONG: Record<CanhBaoCanDate['nguong'], MauBadge> = {
  30: 'nguy',
  60: 'canh-bao',
  90: 'trung-tinh',
};

/** Cùng khuôn `KhoiCanhBaoLechKho` — phần hiển thị thuần, tách khỏi fetch để test không cần mock. */
export function KhoiCanhBaoCanDate({ trangThai }: KhoiCanhBaoCanDateProps) {
  return (
    <section className="tong-quan__khoi">
      <h2 className="tong-quan__tieu-de">Cảnh báo cận date</h2>
      {trangThai.loi ? <p className="tong-quan__loi">{trangThai.loi}</p> : null}
      {!trangThai.loi && trangThai.canhBao.length === 0 ? (
        <p className="tong-quan__rong">Không có lô nào sắp hết hạn trong 90 ngày tới.</p>
      ) : null}
      {trangThai.canhBao.length > 0 ? (
        <>
          <p className="tong-quan__mo-ta">
            Chỉ áp dụng cho sản phẩm đang dùng lô thật có hạn dùng — ngày đầu chuyển đổi hoặc sản phẩm chỉ có lô
            ngầm định sẽ không xuất hiện ở đây.
          </p>
          <Bang>
            <thead>
              <tr>
                <th>Mã hàng</th>
                <th>Tên hàng</th>
                <th>Số lô</th>
                <th>Hạn dùng</th>
                <th>Còn lại</th>
                <th>Tồn</th>
              </tr>
            </thead>
            <tbody>
              {trangThai.canhBao.map((cb) => (
                <tr key={cb.loId}>
                  <td>{cb.maHang}</td>
                  <td>{cb.tenSanPham}</td>
                  <td>{cb.soLo ?? '—'}</td>
                  <td>{cb.hsd}</td>
                  <td>
                    <BadgeTrangThai mau={MAU_THEO_NGUONG[cb.nguong]}>
                      {cb.soNgayConLai < 0 ? 'Đã hết hạn' : `${cb.soNgayConLai} ngày`}
                    </BadgeTrangThai>
                  </td>
                  <OSo>{cb.ton}</OSo>
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
 * Màn Tổng quan (T-034/T-055) — chưa có screenshot KiotViet tham chiếu cho màn
 * này trong `docs/reference/kiotviet/` (theo tiền lệ T-010c/T-023), dựng theo
 * token trong `.claude/skills/design-system/`. Hai khối độc lập, mỗi khối tự
 * fetch/tự báo lỗi riêng — lỗi một khối không kéo sập khối còn lại.
 */
export function TongQuan() {
  const [trangThaiLechKho, setTrangThaiLechKho] = useState<TrangThaiTongQuan | undefined>(undefined);
  const [trangThaiCanDate, setTrangThaiCanDate] = useState<TrangThaiCanDate | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/tong-quan/canh-bao-lech-kho', { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setTrangThaiLechKho({ canhBao: CanhBaoLechKhoResSchema.parse(json).canhBao, loi: undefined }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setTrangThaiLechKho({ canhBao: [], loi: 'Không tải được cảnh báo lệch kho' });
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/tong-quan/canh-bao-can-date', { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setTrangThaiCanDate({ canhBao: CanhBaoCanDateResSchema.parse(json).canhBao, loi: undefined }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setTrangThaiCanDate({ canhBao: [], loi: 'Không tải được cảnh báo cận date' });
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="tong-quan__trang">
      {trangThaiLechKho ? <KhoiCanhBaoLechKho trangThai={trangThaiLechKho} /> : <p>Đang tải…</p>}
      {trangThaiCanDate ? <KhoiCanhBaoCanDate trangThai={trangThaiCanDate} /> : <p>Đang tải…</p>}
    </div>
  );
}
