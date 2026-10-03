import { useState } from 'react';
import { TraHangResSchema, type HoaDonDongDeTraHangItem, type TaoTraHangReq } from '../../../shared/hop-dong/tra-hang';
import { quyDoiSangCoSo } from '../../../shared/don-vi/quy-doi';
import { soLuongHienThi } from '../../../shared/kieu/so-luong';
import { Nut, TruongNhap } from '../../thanh-phan';
import { BangDongHoaDonDeTraHang, useHoaDonDeTraHang } from './TraCuuHoaDon';
import './TaoTraHang.css';

// T-052d — luồng tạo trả hàng (chẻ khỏi T-052c, xem BACKLOG.md). Tái dùng
// NGUYÊN `useHoaDonDeTraHang`/route `GET /api/tra-hang/hoa-don/:ma` (tra cứu)
// và `BangDongHoaDonDeTraHang` (giờ nhận thêm `soLuongTra`/`onSuaSoLuongTra`
// để tự thêm cột nhập — xem `TraCuuHoaDon.tsx`), không viết lại phần tra cứu.
// KHÔNG hiển thị tạm tính "tiền hoàn" từng dòng trước khi lưu — công thức đó
// chỉ sống ở server (`tao-phieu-tra-hang.ts`, cần `thanhTien`/`giamGiaPhanBo`
// không lộ ra `GET .../hoa-don/:ma`); tổng tiền hoàn thật chỉ hiện SAU khi lưu.

/** Có ít nhất một dòng số lượng trả > 0. */
function coDongDuocChon(dong: readonly HoaDonDongDeTraHangItem[], soLuongTra: Readonly<Record<string, number>>): boolean {
  return dong.some((d) => (soLuongTra[d.id] ?? 0) > 0);
}

/** Cập nhật số lượng trả một dòng — bỏ qua giá trị không nguyên, âm, vượt "còn trả được tối đa" của đúng dòng đó. */
export function suaSoLuongTra(
  soLuongTra: Readonly<Record<string, number>>,
  dong: readonly HoaDonDongDeTraHangItem[],
  hoaDonDongId: string,
  giaTriMoi: number,
): Record<string, number> {
  const d = dong.find((x) => x.id === hoaDonDongId);
  if (!d || !Number.isInteger(giaTriMoi) || giaTriMoi < 0 || giaTriMoi > d.conLaiToiDa) return soLuongTra;
  return { ...soLuongTra, [hoaDonDongId]: giaTriMoi };
}

/** `undefined` nếu hợp lệ — ngược lại trả câu lỗi để hiện cho người dùng. */
export function validateTraHang(dong: readonly HoaDonDongDeTraHangItem[], soLuongTra: Readonly<Record<string, number>>): string | undefined {
  if (!coDongDuocChon(dong, soLuongTra)) return 'Chưa nhập số lượng trả cho dòng nào';
  return undefined;
}

/** Chỉ gửi dòng có số lượng > 0; quy đổi số lượng (đơn vị ĐÃ BÁN) sang CƠ SỞ theo hệ số của chính dòng đó (SPEC.md §3.3). */
export function xayDungYeuCauTraHang(
  hoaDonId: string,
  dong: readonly HoaDonDongDeTraHangItem[],
  soLuongTra: Readonly<Record<string, number>>,
): TaoTraHangReq {
  return {
    hoaDonId,
    dong: dong
      .filter((d) => (soLuongTra[d.id] ?? 0) > 0)
      .map((d) => ({
        hoaDonDongId: d.id,
        soLuong: quyDoiSangCoSo(soLuongHienThi(soLuongTra[d.id] ?? 0), d.heSo),
      })),
  };
}

interface TaoTraHangProps {
  /** Gọi khi lưu thành công, kèm id phiếu vừa tạo — màn danh sách mở sẵn chi tiết phiếu này. */
  onTaoXong: (id: string) => void;
}

/** Container: ô tìm hoá đơn theo mã → bảng dòng (kèm ô nhập số lượng trả) → Lưu. */
export function TaoTraHang({ onTaoXong }: TaoTraHangProps) {
  const [oTim, setOTim] = useState('');
  const [maDaTim, setMaDaTim] = useState<string | undefined>(undefined);
  const [soLuongTra, setSoLuongTra] = useState<Record<string, number>>({});
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const { duLieu: hoaDon, dangTai, loi: loiTraCuu } = useHoaDonDeTraHang(maDaTim);

  function timHoaDon(su: React.FormEvent) {
    su.preventDefault();
    setLoi(undefined);
    setSoLuongTra({});
    setMaDaTim(oTim.trim() || undefined);
  }

  function luu(su: React.FormEvent) {
    su.preventDefault();
    if (!hoaDon || dangGui) return;

    const loiHopLe = validateTraHang(hoaDon.dong, soLuongTra);
    if (loiHopLe) {
      setLoi(loiHopLe);
      return;
    }

    setDangGui(true);
    setLoi(undefined);

    fetch('/api/tra-hang', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(xayDungYeuCauTraHang(hoaDon.id, hoaDon.dong, soLuongTra)),
    })
      .then(async (res) => {
        if (!res.ok) {
          const json: unknown = await res.json().catch(() => undefined);
          throw new Error((json as { loi?: string } | undefined)?.loi ?? 'Không lưu được phiếu trả hàng');
        }
        return TraHangResSchema.parse(await res.json());
      })
      .then((phieu) => {
        setDangGui(false);
        onTaoXong(phieu.id);
      })
      .catch((err: unknown) => {
        setDangGui(false);
        setLoi(err instanceof Error ? err.message : 'Không lưu được phiếu trả hàng');
      });
  }

  return (
    <div className="tao-tra-hang">
      <h1 className="tao-tra-hang__tieu-de">Trả hàng</h1>

      <form className="tao-tra-hang__o-tim" onSubmit={timHoaDon}>
        <TruongNhap aria-label="Tìm theo mã hoá đơn" placeholder="Mã hoá đơn" value={oTim} onChange={(su) => setOTim(su.target.value)} />
        <Nut type="submit" bienThe="phu">
          Tìm
        </Nut>
      </form>

      {dangTai ? <p className="tao-tra-hang__thong-bao">Đang tải…</p> : null}
      {loiTraCuu ? (
        <p className="tao-tra-hang__loi" role="alert">
          {loiTraCuu}
        </p>
      ) : null}

      {hoaDon ? (
        <form className="tao-tra-hang__form" onSubmit={luu}>
          <p className="tao-tra-hang__hoa-don">
            Hoá đơn gốc: <strong>{hoaDon.ma}</strong>
          </p>

          <BangDongHoaDonDeTraHang
            dong={hoaDon.dong}
            soLuongTra={soLuongTra}
            onSuaSoLuongTra={(id, giaTri) => setSoLuongTra((v) => suaSoLuongTra(v, hoaDon.dong, id, giaTri))}
          />

          {loi ? (
            <p className="tao-tra-hang__loi" role="alert">
              {loi}
            </p>
          ) : null}

          <Nut type="submit" bienThe="chinh" disabled={dangGui}>
            {dangGui ? 'Đang lưu…' : 'Lưu'}
          </Nut>
        </form>
      ) : null}
    </div>
  );
}
