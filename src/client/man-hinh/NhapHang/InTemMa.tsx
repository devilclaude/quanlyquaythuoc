import JsBarcode from 'jsbarcode';
import { useEffect, useRef, useState } from 'react';
import { dong } from '../../../shared/kieu/dong';
import { dinhDangTien } from '../../../shared/tien/dinh-dang';
import { Bang, Nut, OSo } from '../../thanh-phan';
import './InTemMa.css';

// T-042 — In tem mã, mở ngay sau khi Hoàn thành một phiếu nhập (SPEC.md §6.2
// bước 4). Tái dùng khuôn modal của `InHoaDon.tsx` (T-023): role="dialog",
// Esc đóng, nút "In" tự focus để Enter in ngay (hành vi nút HTML gốc, không
// cần bắt phím riêng). Khác InHoaDon: đây là MỘT BẢNG sửa được số lượng
// trước khi in (khớp ảnh "In tem mã"), và gộp bước "Chọn loại giấy" +
// "Xem bản in" của KiotViet (hai màn tách rời) thành MỘT màn xem trước sống —
// đổi khổ giấy thấy ngay, giống cách InHoaDon đã làm với K57/K80. Gộp bớt
// bước không vi phạm UI-FIDELITY.md ("không được cần NHIỀU bước hơn").
//
// Cố tình khác KiotViet: chỉ 2 khổ giấy (ảnh "Chọn loại giấy in tem mã" có
// 8 loại) — không biết quầy đang dùng máy in tem thật nào để chọn đúng khổ
// (giống lý do BLOCKED.md mục T-061 thiếu thông tin hạ tầng thật); thêm khổ
// giấy khác sau này chỉ là thêm một phần tử vào `DS_KHO_GIAY_TEM`, không
// phải quyết định kiến trúc. Giá hiển thị trên tem là GIÁ BÁN của đơn vị đã
// chọn lúc nhập (khớp ảnh preview "145,000 VND/hộp"), không phải đơn giá
// NHẬP — hai con số khác nhau trong `DongPhieuNhapUI`.

export interface KhoGiayTem {
  id: string;
  ten: string;
  rongMm: number;
  caoMm: number;
  soCot: number;
}

export const KHO_1_NHAN: KhoGiayTem = { id: '1-nhan', ten: 'Cuộn 1 nhãn (50×30mm)', rongMm: 50, caoMm: 30, soCot: 1 };
export const KHO_2_NHAN: KhoGiayTem = { id: '2-nhan', ten: 'Cuộn 2 nhãn (72×22mm)', rongMm: 72, caoMm: 22, soCot: 2 };
export const DS_KHO_GIAY_TEM: readonly KhoGiayTem[] = [KHO_1_NHAN, KHO_2_NHAN];

export interface DongTemUI {
  id: string;
  maHang: string;
  ten: string;
  donViTen: string;
  giaBan: number;
  soLuong: number;
}

/** Chỉ những trường cần để dựng danh sách tem — khai riêng (không import
 * `DongPhieuNhapUI` từ `NhapHang.tsx`) để tránh vòng import giữa hai file,
 * cùng lý do `DongGioHangChoIn` đã tách khỏi `BanHang.tsx` ở `InHoaDon.tsx`. */
export interface DongPhieuNhapChoTem {
  id: string;
  maHang: string;
  ten: string;
  donViTinhId: string;
  donViTen: string;
  soLuong: number;
  dsDonVi: readonly { id: string; giaBan: number }[];
}

/** Danh sách tem ban đầu từ phiếu nhập vừa hoàn thành — số lượng tem mặc
 * định bằng số lượng đã nhập, sửa được trước khi in (SPEC.md §6.2 bước 4). */
export function xayDungDsTemTuPhieuNhap(dsDong: readonly DongPhieuNhapChoTem[]): DongTemUI[] {
  return dsDong.map((d) => ({
    id: d.id,
    maHang: d.maHang,
    ten: d.ten,
    donViTen: d.donViTen,
    giaBan: d.dsDonVi.find((dv) => dv.id === d.donViTinhId)?.giaBan ?? 0,
    soLuong: d.soLuong,
  }));
}

/** Số lượng tem cho phép 0 (bỏ in dòng đó mà không cần xoá hẳn) nhưng không âm. */
export function suaSoLuongTem(dsTem: DongTemUI[], chiSo: number, soLuongMoi: number): DongTemUI[] {
  if (!Number.isInteger(soLuongMoi) || soLuongMoi < 0) return dsTem;
  return dsTem.map((t, i) => (i === chiSo ? { ...t, soLuong: soLuongMoi } : t));
}

export function xoaDongTem(dsTem: DongTemUI[], chiSo: number): DongTemUI[] {
  return dsTem.filter((_, i) => i !== chiSo);
}

export function tongSoLuongTem(dsTem: readonly DongTemUI[]): number {
  return dsTem.reduce((tong, t) => tong + t.soLuong, 0);
}

/** Mỗi dòng lặp lại đúng Số lượng lần — một tem vật lý cho mỗi lần lặp, nội
 * dung giống hệt nhau trong cùng một dòng (ảnh "In tem mã": hai tem "Betaloc
 * 50mg" cạnh nhau khi Số lượng = 2). Dòng số lượng 0 không sinh tem nào. */
export function trieuKhaiDsTem(dsTem: readonly DongTemUI[]): DongTemUI[] {
  const ketQua: DongTemUI[] = [];
  for (const t of dsTem) {
    for (let i = 0; i < t.soLuong; i++) ketQua.push(t);
  }
  return ketQua;
}

/** Máy in tem không in được chữ có dấu (BACKLOG.md T-042, ghi chú lấy nguyên
 * văn từ màn hình KiotViet) — CHỈ áp dụng cho nội dung IN THẬT (bước xem
 * trước), không áp cho bước hỏi danh sách trước đó (vẫn cần dấu để dược sĩ
 * nhận đúng hàng). NFD tách dấu khỏi chữ cái rồi xoá dấu, cộng thêm `đ`/`Đ`
 * (không tách được bằng NFD vì là một ký tự Unicode riêng, không phải "d" +
 * dấu gạch ngang). */
export function boDauTiengViet(chuoi: string): string {
  return chuoi
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

interface MotTemProps {
  tem: DongTemUI;
  caoMm: number;
}

/** Một nhãn vật lý — mã vạch render bằng `jsbarcode` sau khi mount (cần DOM
 * thật, không chạy trong test tĩnh `renderToStaticMarkup`). */
function MotTem({ tem, caoMm }: MotTemProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, tem.maHang, {
      format: 'CODE128',
      displayValue: true,
      fontSize: 11,
      height: 28,
      margin: 2,
    });
  }, [tem.maHang]);

  return (
    <div className="in-tem-ma__tem" style={{ height: `${caoMm}mm` }}>
      <p className="in-tem-ma__ten-hang">
        {boDauTiengViet(tem.ten)} ({boDauTiengViet(tem.donViTen)})
      </p>
      <svg ref={svgRef} />
      <p className="in-tem-ma__gia">
        <strong>
          {dinhDangTien(dong(tem.giaBan))} VND/{boDauTiengViet(tem.donViTen)}
        </strong>
      </p>
    </div>
  );
}

type Buoc = 'danh-sach' | 'xem-truoc';

interface InTemMaProps {
  dsTemBanDau: DongTemUI[];
  onDong: () => void;
}

/** Hỏi in tem mã ngay sau khi Hoàn thành một phiếu nhập (T-042). Chỉ nên mount
 * khi có phiếu vừa hoàn thành — NhapHang.tsx mount/unmount theo điều kiện
 * (cùng khuôn `{dangTaoHangMoi ? <TaoMoiHangHoa .../> : null}` đã có), KHÔNG
 * giữ component luôn mount rồi tự ẩn bằng prop `undefined`: state nội bộ
 * (`dsTem`, bước đang ở, khổ giấy) chỉ đúng khởi tạo một lần lúc mount — giữ
 * mount xuyên suốt rồi đồng bộ qua `useEffect` khi prop đổi sẽ cho state cũ ở
 * lần render đầu (test `renderToStaticMarkup` không chạy effect lộ ra ngay:
 * bảng rỗng dù đã truyền dữ liệu). */
export function InTemMa({ dsTemBanDau, onDong }: InTemMaProps) {
  const [buoc, setBuoc] = useState<Buoc>('danh-sach');
  const [dsTem, setDsTem] = useState<DongTemUI[]>(dsTemBanDau);
  const [khoGiayId, setKhoGiayId] = useState<string>(KHO_2_NHAN.id);
  const hopThoaiRef = useRef<HTMLDivElement>(null);
  const nutInRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (buoc === 'danh-sach') hopThoaiRef.current?.focus();
    else nutInRef.current?.focus();
  }, [buoc]);

  const khoGiay = DS_KHO_GIAY_TEM.find((k) => k.id === khoGiayId) ?? KHO_2_NHAN;

  function dongLai() {
    setBuoc('danh-sach');
    onDong();
  }

  function xuLyPhimDong(su: React.KeyboardEvent) {
    if (su.key === 'Escape') dongLai();
  }

  if (buoc === 'danh-sach') {
    return (
      <div className="in-tem-ma__man-phu" role="presentation">
        <div
          ref={hopThoaiRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="In tem mã"
          className="in-tem-ma"
          onKeyDown={xuLyPhimDong}
        >
          <header className="in-tem-ma__dau">
            <h2 className="in-tem-ma__tieu-de">In tem mã</h2>
            <button type="button" aria-label="Đóng" className="in-tem-ma__dong" onClick={dongLai}>
              ×
            </button>
          </header>

          <Bang>
            <thead>
              <tr>
                <th></th>
                <th>Mã hàng</th>
                <th>Tên hàng</th>
                <th>Số lượng</th>
              </tr>
            </thead>
            <tbody>
              <tr className="in-tem-ma__dong-tong">
                <td></td>
                <td></td>
                <td>Tổng số tem</td>
                <OSo>
                  <strong>{tongSoLuongTem(dsTem)}</strong>
                </OSo>
              </tr>
              {dsTem.map((t, i) => (
                <tr key={t.id}>
                  <td>
                    <button
                      type="button"
                      className="gio-hang__nut-xoa"
                      aria-label={`Xoá dòng ${t.ten} khỏi danh sách in tem`}
                      onClick={() => setDsTem((ds) => xoaDongTem(ds, i))}
                    >
                      ✕
                    </button>
                  </td>
                  <td>{t.maHang}</td>
                  <td>
                    {t.ten} ({t.donViTen})
                  </td>
                  <OSo>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      aria-label={`Số lượng tem ${t.ten}`}
                      value={t.soLuong}
                      onChange={(su) => setDsTem((ds) => suaSoLuongTem(ds, i, Number.parseInt(su.target.value, 10)))}
                    />
                  </OSo>
                </tr>
              ))}
            </tbody>
          </Bang>

          <div className="in-tem-ma__hanh-dong">
            <Nut bienThe="phu" onClick={dongLai}>
              Bỏ qua
            </Nut>
            <Nut
              bienThe="chinh"
              disabled={dsTem.length === 0 || tongSoLuongTem(dsTem) === 0}
              onClick={() => setBuoc('xem-truoc')}
            >
              In tem mã
            </Nut>
          </div>
        </div>
      </div>
    );
  }

  const dsTemIn = trieuKhaiDsTem(dsTem);

  return (
    <div className="in-tem-ma__man-phu" role="presentation">
      {/* @page phải đặt theo khổ giấy đang chọn — CSS không chọn được @page
       * theo class, nên tự sinh nội dung style theo state (tiền lệ T-023). */}
      <style>{`@page { size: ${khoGiay.rongMm * khoGiay.soCot}mm auto; margin: 0; }`}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Xem trước tem mã"
        className="in-tem-ma"
        onKeyDown={xuLyPhimDong}
      >
        <header className="in-tem-ma__dau">
          <h2 className="in-tem-ma__tieu-de">Xem trước tem mã</h2>
          <button type="button" aria-label="Đóng" className="in-tem-ma__dong" onClick={dongLai}>
            ×
          </button>
        </header>

        <fieldset className="in-tem-ma__kho-giay" aria-label="Khổ giấy">
          {DS_KHO_GIAY_TEM.map((k) => (
            <label key={k.id} className="in-tem-ma__radio-kho">
              <input
                type="radio"
                name="in-tem-ma-kho-giay"
                value={k.id}
                checked={khoGiayId === k.id}
                onChange={() => setKhoGiayId(k.id)}
              />
              {k.ten}
            </label>
          ))}
        </fieldset>

        <div className="in-tem-ma__khung-xem-truoc">
          <div className="in-tem-ma__trang" style={{ gridTemplateColumns: `repeat(${khoGiay.soCot}, ${khoGiay.rongMm}mm)` }}>
            {dsTemIn.map((t, i) => (
              <MotTem key={`${t.id}-${i}`} tem={t} caoMm={khoGiay.caoMm} />
            ))}
          </div>
        </div>

        <div className="in-tem-ma__hanh-dong">
          <Nut bienThe="phu" onClick={() => setBuoc('danh-sach')}>
            Quay lại
          </Nut>
          <Nut ref={nutInRef} bienThe="chinh" onClick={() => window.print()}>
            In (Enter)
          </Nut>
        </div>
      </div>
    </div>
  );
}
