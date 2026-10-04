import type { ReactNode } from 'react';
import { Fragment, useEffect, useState } from 'react';
import { DanhSachTraHangNhapResSchema, type TraHangNhapDanhSachItem } from '../../../shared/hop-dong/tra-hang-nhap';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangThoiGianVN } from '../../../shared/thoi-gian/dinh-dang';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, OSo, TruongNhap } from '../../thanh-phan';
import { ChiTietPhieuNhap } from '../NhapHang/ChiTietPhieuNhap';
import { ChiTietTraHangNhap } from './ChiTietTraHangNhap';
import './DanhSachTraHangNhap.css';

// T-053c1 — Danh sách và chi tiết (CHỈ ĐỌC) trả hàng nhập, cùng khuôn
// `DanhSachTraHang`/T-052c. Cột khớp screenshot "Trả hàng nhập" (thực chất là
// `docs/reference/kiotviet/Quản trị/Trả hàng/Danh sách trả hàng.png`, tiêu đề
// TRONG ảnh là "Trả hàng nhập" — phát hiện của `doi-chieu-ui` lúc đối chiếu
// T-052c) CHO PHẦN CÒN LẠI SAU KHI BỎ: "Nhà cung cấp"/"NCC cần trả"/"NCC đã
// trả" (không công nợ NCC — v1.1, cùng quyết định T-041/T-052c với "Người
// bán"/"Khách hàng"), gộp "Tổng tiền hàng"/"Giảm giá" thành "Tổng tiền hoàn"
// (schema không lưu giảm giá phiếu trả hàng nhập), không có bộ lọc "Trạng
// thái"/"Thời gian"/"Người tạo"/"Người trả" (quầy một người dùng, một phiếu
// trả hàng nhập luôn hoàn tất ngay — không có "Phiếu tạm") — thay bằng "Mã
// nhập hàng" (liên kết ngược, T-053b) để tra được gốc ngay từ danh sách. Ô
// "Theo mã phiếu trả" lọc NGAY TRÊN danh sách đã tải, cùng quyết định T-052c.
//
// Liên kết ngược MỘT CHIỀU ở slice này (trả hàng nhập → phiếu nhập gốc):
// toggle inline tái dùng THẲNG `ChiTietPhieuNhap` (T-041) qua `renderPhieuNhapGoc`.
// KHÔNG có nút "+ Trả hàng nhập" (luồng tạo) ở đây — đo trước khi mở PR cho
// thấy gộp cả luồng tạo + liên kết ngược chiều kia (nút "Trả hàng nhập" ở
// `ChiTietPhieuNhap`) vượt ngưỡng 1000 dòng/24 file (CLAUDE.md); chẻ ngay
// (không build thử rồi bỏ, theo đúng tiền lệ T-040a/T-052a) thành T-053c2
// (TODO trong BACKLOG.md) — cùng hình chẻ T-052c/d.

interface BangDanhSachTraHangNhapProps {
  duLieu: TraHangNhapDanhSachItem[];
  dangTai: boolean;
  loi: string | undefined;
  phieuChonId: string | undefined;
  onChonDong: (id: string) => void;
  renderChiTiet: (id: string) => ReactNode;
}

/** Thuần theo props — dựng riêng để test không phải đợi fetch thật. */
export function BangDanhSachTraHangNhap({ duLieu, dangTai, loi, phieuChonId, onChonDong, renderChiTiet }: BangDanhSachTraHangNhapProps) {
  return (
    <Bang>
      <thead>
        <tr>
          <th>Mã trả hàng nhập</th>
          <th>Mã nhập hàng</th>
          <th>Thời gian</th>
          <th>Tổng tiền hoàn</th>
        </tr>
      </thead>
      <tbody>
        {loi ? (
          <tr>
            <td colSpan={4} className="danh-sach-tra-hang-nhap__thong-bao danh-sach-tra-hang-nhap__thong-bao--loi">
              {loi}
            </td>
          </tr>
        ) : dangTai ? (
          <tr>
            <td colSpan={4} className="danh-sach-tra-hang-nhap__thong-bao">
              Đang tải…
            </td>
          </tr>
        ) : duLieu.length === 0 ? (
          <tr>
            <td colSpan={4} className="danh-sach-tra-hang-nhap__thong-bao">
              Không có phiếu trả hàng nhập nào
            </td>
          </tr>
        ) : (
          duLieu.map((p) => (
            <Fragment key={p.id}>
              <tr
                tabIndex={0}
                role="button"
                aria-expanded={phieuChonId === p.id}
                className={phieuChonId === p.id ? 'danh-sach-tra-hang-nhap__dong--dang-chon' : undefined}
                onClick={() => onChonDong(p.id)}
                onKeyDown={(su) => {
                  if (su.key === 'Enter') onChonDong(p.id);
                }}
              >
                <td>{p.ma}</td>
                <td>{p.phieuNhapMa}</td>
                <td>{dinhDangThoiGianVN(p.thoiGian)}</td>
                <OSo>{dinhDangTien(dong(p.tongTienHoan))}</OSo>
              </tr>
              {phieuChonId === p.id ? (
                <tr>
                  <td colSpan={4} className="danh-sach-tra-hang-nhap__chi-tiet">
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
export function DanhSachTraHangNhap() {
  const [tim, setTim] = useState('');
  const [duLieu, setDuLieu] = useState<TraHangNhapDanhSachItem[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const [phieuChonId, setPhieuChonId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    setDangTai(true);
    fetch('/api/tra-hang-nhap', { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        setDuLieu(DanhSachTraHangNhapResSchema.parse(json).duLieu);
        setDangTai(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoi('Không tải được danh sách trả hàng nhập');
        setDangTai(false);
      });

    return () => controller.abort();
  }, []);

  const timChuanHoa = tim.trim().toLowerCase();
  const duLieuLoc = timChuanHoa ? duLieu.filter((p) => p.ma.toLowerCase().includes(timChuanHoa)) : duLieu;

  return (
    <div className="danh-sach-tra-hang-nhap">
      <h1 className="danh-sach-tra-hang-nhap__tieu-de">Trả hàng nhập</h1>
      <div className="danh-sach-tra-hang-nhap__thanh-cong-cu">
        <TruongNhap aria-label="Theo mã phiếu trả" placeholder="Theo mã phiếu trả" value={tim} onChange={(su) => setTim(su.target.value)} />
      </div>
      <BangDanhSachTraHangNhap
        duLieu={duLieuLoc}
        dangTai={dangTai}
        loi={loi}
        phieuChonId={phieuChonId}
        onChonDong={(id) => setPhieuChonId((hienTai) => (hienTai === id ? undefined : id))}
        renderChiTiet={(id) => <ChiTietTraHangNhap id={id} renderPhieuNhapGoc={(phieuNhapId) => <ChiTietPhieuNhap id={phieuNhapId} />} />}
      />
    </div>
  );
}
