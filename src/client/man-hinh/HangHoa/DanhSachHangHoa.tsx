import type { ReactNode } from 'react';
import { Fragment, useEffect, useState } from 'react';
import { DanhSachHangHoaResSchema, type HangHoaDanhSachItem } from '../../../shared/hop-dong/hang-hoa';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangSo, dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, Nut, OSo, TruongNhap } from '../../thanh-phan';
import { ChiTietHangHoa } from './ChiTietHangHoa';
import { TaoMoiHangHoa } from './TaoMoiHangHoa';
import './DanhSachHangHoa.css';

/** SPEC.md §3.6: lưu UTC, hiển thị giờ Việt Nam — dd/MM/yyyy HH:mm. */
export function dinhDangThoiGianVN(iso: string): string {
  const thoiDiem = new Date(iso);
  const tuyChonChung = { timeZone: 'Asia/Ho_Chi_Minh' } as const;
  const ngayThang = new Intl.DateTimeFormat('en-GB', {
    ...tuyChonChung,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(thoiDiem);
  const gioPhut = new Intl.DateTimeFormat('en-GB', {
    ...tuyChonChung,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(thoiDiem);
  return `${ngayThang} ${gioPhut}`;
}

/** Bấm lại dòng đang mở thì đóng; bấm dòng khác thì chuyển sang dòng đó. */
export function chonDongTiepTheo(
  hienTai: string | undefined,
  idBam: string,
): string | undefined {
  return hienTai === idBam ? undefined : idBam;
}

interface BangDanhSachHangHoaProps {
  duLieu: HangHoaDanhSachItem[];
  dangTai: boolean;
  loi: string | undefined;
  hangChonId: string | undefined;
  onChonDong: (id: string) => void;
  renderChiTiet: (id: string) => ReactNode;
}

/** Thuần theo props — dựng riêng để test không phải đợi fetch thật. */
export function BangDanhSachHangHoa({
  duLieu,
  dangTai,
  loi,
  hangChonId,
  onChonDong,
  renderChiTiet,
}: BangDanhSachHangHoaProps) {
  return (
    <Bang>
      <thead>
        <tr>
          <th>Mã hàng</th>
          <th>Tên hàng</th>
          <th>Giá bán</th>
          <th>Giá vốn</th>
          <th>Tồn kho</th>
          <th>Thời gian tạo</th>
        </tr>
      </thead>
      <tbody>
        {loi ? (
          <tr>
            <td colSpan={6} className="danh-sach-hang-hoa__thong-bao danh-sach-hang-hoa__thong-bao--loi">
              {loi}
            </td>
          </tr>
        ) : dangTai ? (
          <tr>
            <td colSpan={6} className="danh-sach-hang-hoa__thong-bao">
              Đang tải…
            </td>
          </tr>
        ) : duLieu.length === 0 ? (
          <tr>
            <td colSpan={6} className="danh-sach-hang-hoa__thong-bao">
              Không có hàng hoá nào khớp
            </td>
          </tr>
        ) : (
          duLieu.map((hang) => (
            <Fragment key={hang.id}>
              <tr
                tabIndex={0}
                role="button"
                aria-expanded={hangChonId === hang.id}
                className={hangChonId === hang.id ? 'danh-sach-hang-hoa__dong--dang-chon' : undefined}
                onClick={() => onChonDong(hang.id)}
                onKeyDown={(su) => {
                  if (su.key === 'Enter') onChonDong(hang.id);
                }}
              >
                <td>{hang.maHang}</td>
                <td>{hang.ten}</td>
                <OSo>{dinhDangTien(dong(hang.giaBan))}</OSo>
                <OSo>{dinhDangTien(dong(hang.giaVon))}</OSo>
                <OSo>{dinhDangSo(hang.tonKho)}</OSo>
                <td>{dinhDangThoiGianVN(hang.ngayTao)}</td>
              </tr>
              {hangChonId === hang.id ? (
                <tr>
                  <td colSpan={6} className="danh-sach-hang-hoa__chi-tiet">
                    {renderChiTiet(hang.id)}
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

/** Container: fetch danh sách theo từ khoá tìm, debounce nhẹ để không gọi API mỗi phím gõ. */
export function DanhSachHangHoa() {
  const [tim, setTim] = useState('');
  const [duLieu, setDuLieu] = useState<HangHoaDanhSachItem[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const [hangChonId, setHangChonId] = useState<string | undefined>(undefined);
  const [phienBanLamMoi, setPhienBanLamMoi] = useState(0);
  const [dangTaoMoi, setDangTaoMoi] = useState(false);

  useEffect(() => {
    const dinhThoiGian = setTimeout(() => {
      const controller = new AbortController();
      setDangTai(true);
      setLoi(undefined);

      const url = tim ? `/api/hang-hoa?tim=${encodeURIComponent(tim)}` : '/api/hang-hoa';
      fetch(url, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => {
          setDuLieu(DanhSachHangHoaResSchema.parse(json).duLieu);
          setDangTai(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setLoi('Không tải được danh sách hàng hoá');
          setDangTai(false);
        });

      return () => controller.abort();
    }, 250);

    return () => clearTimeout(dinhThoiGian);
  }, [tim, phienBanLamMoi]);

  return (
    <section className="danh-sach-hang-hoa">
      <h1 className="danh-sach-hang-hoa__tieu-de">Hàng hóa</h1>
      <div className="danh-sach-hang-hoa__thanh-cong-cu">
        <TruongNhap
          aria-label="Tìm hàng hoá theo mã, tên hàng"
          placeholder="Theo mã, tên hàng"
          value={tim}
          onChange={(su) => setTim(su.target.value)}
        />
        <Nut bienThe="chinh" onClick={() => setDangTaoMoi(true)}>
          + Tạo mới
        </Nut>
      </div>
      <BangDanhSachHangHoa
        duLieu={duLieu}
        dangTai={dangTai}
        loi={loi}
        hangChonId={hangChonId}
        onChonDong={(id) => setHangChonId((hienTai) => chonDongTiepTheo(hienTai, id))}
        renderChiTiet={(id) => <ChiTietHangHoa id={id} />}
      />
      {dangTaoMoi ? (
        <TaoMoiHangHoa
          onHuy={() => setDangTaoMoi(false)}
          onTaoXong={(id) => {
            setDangTaoMoi(false);
            setPhienBanLamMoi((v) => v + 1);
            setHangChonId(id);
          }}
        />
      ) : null}
    </section>
  );
}
