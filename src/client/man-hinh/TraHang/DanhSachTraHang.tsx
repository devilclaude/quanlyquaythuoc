import type { ReactNode } from 'react';
import { Fragment, useEffect, useState } from 'react';
import { DanhSachTraHangResSchema, type TraHangDanhSachItem } from '../../../shared/hop-dong/tra-hang';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangThoiGianVN } from '../../../shared/thoi-gian/dinh-dang';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, OSo, TruongNhap } from '../../thanh-phan';
import { ChiTietTraHang } from './ChiTietTraHang';
import './DanhSachTraHang.css';

// T-052c — Danh sách và chi tiết trả hàng (CHỈ ĐỌC — luồng TẠO trả hàng chẻ
// sang task mới, xem BACKLOG.md, cùng lý do chẻ T-041/T-041b: gộp chung vượt
// ngưỡng 1000 dòng/PR khi đo thật trước khi mở PR). Cột khớp screenshot "Danh
// sách trả hàng" CHO PHẦN CÒN LẠI SAU KHI BỎ: "Người bán"/"Mã KH"/"Khách
// hàng" (quầy một người dùng, không công nợ khách — v1.1, cùng quyết định
// T-041 với "Nhà cung cấp"/"Người tạo"), "Cần trả khách"/"Đã trả khách"
// (không có khái niệm trả nhiều lần/một phần CHO MỘT PHIẾU — SPEC.md chỉ có
// "Đã trả", gộp thành một cột "Tổng tiền hoàn"), không có bộ lọc "Loại trả
// hàng"/"Trạng thái" (không có "Đã huỷ" — chưa có luồng huỷ phiếu trả trong
// BACKLOG.md) — thay bằng "Mã hoá đơn" (liên kết ngược, T-052b) để tra được
// gốc ngay từ danh sách mà không cần mở chi tiết. Ô "Theo mã phiếu trả" lọc
// NGAY TRÊN danh sách đã tải (không gọi lại API, không có tham số `tim` ở
// `layDanhSachTraHang`) — số phiếu trả hàng của một quầy nhỏ không cần lọc
// phía server; thêm lọc server-side khi cần (vd. sau khi dữ liệu lớn hơn) là
// việc của task khác, không phải quyết định kiến trúc của task này.

interface BangDanhSachTraHangProps {
  duLieu: TraHangDanhSachItem[];
  dangTai: boolean;
  loi: string | undefined;
  phieuChonId: string | undefined;
  onChonDong: (id: string) => void;
  renderChiTiet: (id: string) => ReactNode;
}

/** Thuần theo props — dựng riêng để test không phải đợi fetch thật. */
export function BangDanhSachTraHang({ duLieu, dangTai, loi, phieuChonId, onChonDong, renderChiTiet }: BangDanhSachTraHangProps) {
  return (
    <Bang>
      <thead>
        <tr>
          <th>Mã trả hàng</th>
          <th>Mã hoá đơn</th>
          <th>Thời gian</th>
          <th>Tổng tiền hoàn</th>
        </tr>
      </thead>
      <tbody>
        {loi ? (
          <tr>
            <td colSpan={4} className="danh-sach-tra-hang__thong-bao danh-sach-tra-hang__thong-bao--loi">
              {loi}
            </td>
          </tr>
        ) : dangTai ? (
          <tr>
            <td colSpan={4} className="danh-sach-tra-hang__thong-bao">
              Đang tải…
            </td>
          </tr>
        ) : duLieu.length === 0 ? (
          <tr>
            <td colSpan={4} className="danh-sach-tra-hang__thong-bao">
              Không có phiếu trả hàng nào
            </td>
          </tr>
        ) : (
          duLieu.map((p) => (
            <Fragment key={p.id}>
              <tr
                tabIndex={0}
                role="button"
                aria-expanded={phieuChonId === p.id}
                className={phieuChonId === p.id ? 'danh-sach-tra-hang__dong--dang-chon' : undefined}
                onClick={() => onChonDong(p.id)}
                onKeyDown={(su) => {
                  if (su.key === 'Enter') onChonDong(p.id);
                }}
              >
                <td>{p.ma}</td>
                <td>{p.hoaDonMa}</td>
                <td>{dinhDangThoiGianVN(p.thoiGian)}</td>
                <OSo>{dinhDangTien(dong(p.tongTienHoan))}</OSo>
              </tr>
              {phieuChonId === p.id ? (
                <tr>
                  <td colSpan={4} className="danh-sach-tra-hang__chi-tiet">
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

/** Container: tải danh sách một lần, ô tìm lọc ngay trên dữ liệu đã tải. */
export function DanhSachTraHang() {
  const [tim, setTim] = useState('');
  const [duLieu, setDuLieu] = useState<TraHangDanhSachItem[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const [phieuChonId, setPhieuChonId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/tra-hang', { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        setDuLieu(DanhSachTraHangResSchema.parse(json).duLieu);
        setDangTai(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoi('Không tải được danh sách trả hàng');
        setDangTai(false);
      });

    return () => controller.abort();
  }, []);

  const timChuanHoa = tim.trim().toLowerCase();
  const duLieuLoc = timChuanHoa ? duLieu.filter((p) => p.ma.toLowerCase().includes(timChuanHoa)) : duLieu;

  return (
    <div className="danh-sach-tra-hang">
      <h1 className="danh-sach-tra-hang__tieu-de">Trả hàng</h1>
      <TruongNhap aria-label="Theo mã phiếu trả" placeholder="Theo mã phiếu trả" value={tim} onChange={(su) => setTim(su.target.value)} />
      <BangDanhSachTraHang
        duLieu={duLieuLoc}
        dangTai={dangTai}
        loi={loi}
        phieuChonId={phieuChonId}
        onChonDong={(id) => setPhieuChonId((hienTai) => (hienTai === id ? undefined : id))}
        renderChiTiet={(id) => <ChiTietTraHang id={id} />}
      />
    </div>
  );
}
