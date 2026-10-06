import type { ReactNode } from 'react';
import { Fragment, useEffect, useState } from 'react';
import { DanhSachTraHangNhapResSchema, type TraHangNhapDanhSachItem } from '../../../shared/hop-dong/tra-hang-nhap';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangThoiGianVN } from '../../../shared/thoi-gian/dinh-dang';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, Nut, OSo, TruongNhap } from '../../thanh-phan';
import { ChiTietPhieuNhap } from '../NhapHang/ChiTietPhieuNhap';
import { ChiTietTraHangNhap } from './ChiTietTraHangNhap';
import { TaoTraHangNhap } from './TaoTraHangNhap';
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
// Liên kết ngược MỘT CHIỀU ở T-053c1 (trả hàng nhập → phiếu nhập gốc): toggle
// inline tái dùng THẲNG `ChiTietPhieuNhap` (T-041) qua `renderPhieuNhapGoc`.
//
// T-053c2 — nút "+ Trả hàng nhập" mở luồng tạo (`TaoTraHangNhap`, chẻ khỏi
// T-053c1 vì gộp chung vượt ngưỡng 1000 dòng/PR, xem BACKLOG.md). Cùng khuôn
// `dangTaoMoi`/"← Danh sách..." đã dùng ở `DanhSachTraHang` (T-052d). Prop
// `maPhieuNhapGoiY` (+ `onDaDungMaGoiY` để xoá state ở `App.tsx` sau khi dùng)
// phục vụ liên kết ngược CHIỀU CÒN LẠI: nút "Trả hàng nhập" ở chân
// `ChiTietPhieuNhap` nhảy sang đây, mở sẵn luồng tạo với mã đã điền và tự tra
// cứu — không cần gõ lại.

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

interface DanhSachTraHangNhapProps {
  /** Mã phiếu nhập điền sẵn + mở luồng tạo ngay (liên kết ngược từ `ChiTietPhieuNhap`, T-053c2). */
  maPhieuNhapGoiY?: string | undefined;
  /** Gọi ngay khi đã dùng `maPhieuNhapGoiY` — để `App.tsx` xoá state, tránh mở lại luồng tạo khi quay lại tab này lần sau. */
  onDaDungMaGoiY?: (() => void) | undefined;
}

/** Container: tải danh sách một lần, ô tìm lọc ngay trên dữ liệu đã tải, "+ Trả hàng nhập" mở luồng tạo. */
export function DanhSachTraHangNhap({ maPhieuNhapGoiY, onDaDungMaGoiY }: DanhSachTraHangNhapProps = {}) {
  const [tim, setTim] = useState('');
  const [duLieu, setDuLieu] = useState<TraHangNhapDanhSachItem[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const [phieuChonId, setPhieuChonId] = useState<string | undefined>(undefined);
  const [phienBanLamMoi, setPhienBanLamMoi] = useState(0);
  const [dangTaoMoi, setDangTaoMoi] = useState(false);
  // Chụp lại `maPhieuNhapGoiY` vào state RIÊNG của component này — không đọc
  // thẳng prop khi render `TaoTraHangNhap`. `onDaDungMaGoiY` xoá state ở
  // `App.tsx` NGAY trong effect dưới đây (cùng lượt render với `setDangTaoMoi`,
  // React 18 batch chung) nên prop `maPhieuNhapGoiY` đã về `undefined` trước
  // khi `TaoTraHangNhap` kịp mount — phải giữ giá trị đã chụp ở state riêng
  // thì mới sống sót qua lượt render đó.
  const [maGoiYDaChup, setMaGoiYDaChup] = useState<string | undefined>(undefined);

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
  }, [phienBanLamMoi]);

  useEffect(() => {
    if (!maPhieuNhapGoiY) return;
    setMaGoiYDaChup(maPhieuNhapGoiY);
    setDangTaoMoi(true);
    onDaDungMaGoiY?.();
  }, [maPhieuNhapGoiY, onDaDungMaGoiY]);

  const timChuanHoa = tim.trim().toLowerCase();
  const duLieuLoc = timChuanHoa ? duLieu.filter((p) => p.ma.toLowerCase().includes(timChuanHoa)) : duLieu;

  function taoXong(id: string) {
    setDangTaoMoi(false);
    setPhienBanLamMoi((v) => v + 1);
    setPhieuChonId(id);
  }

  if (dangTaoMoi) {
    return (
      <div className="danh-sach-tra-hang-nhap">
        <button type="button" className="danh-sach-tra-hang-nhap__quay-lai" onClick={() => setDangTaoMoi(false)}>
          ← Danh sách trả hàng nhập
        </button>
        <TaoTraHangNhap onTaoXong={taoXong} maGoiY={maGoiYDaChup} />
      </div>
    );
  }

  return (
    <div className="danh-sach-tra-hang-nhap">
      <h1 className="danh-sach-tra-hang-nhap__tieu-de">Trả hàng nhập</h1>
      <div className="danh-sach-tra-hang-nhap__thanh-cong-cu">
        <TruongNhap aria-label="Theo mã phiếu trả" placeholder="Theo mã phiếu trả" value={tim} onChange={(su) => setTim(su.target.value)} />
        <Nut bienThe="chinh" onClick={() => setDangTaoMoi(true)}>
          + Trả hàng nhập
        </Nut>
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
