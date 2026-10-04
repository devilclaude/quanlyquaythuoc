import { useState } from 'react';
import { TraHangNhapResSchema, type PhieuNhapDongDeTraHangNhapItem, type TaoTraHangNhapReq } from '../../../shared/hop-dong/tra-hang-nhap';
import { quyDoiSangCoSo } from '../../../shared/don-vi/quy-doi';
import { soLuongHienThi } from '../../../shared/kieu/so-luong';
import { Nut, TruongNhap } from '../../thanh-phan';
import { BangDongPhieuNhapDeTraHangNhap, usePhieuNhapDeTraHangNhap } from './TraCuuPhieuNhap';
import './TaoTraHangNhap.css';

// T-053c2 — luồng tạo trả hàng nhập (chẻ khỏi T-053c1, xem BACKLOG.md). Tái
// dùng NGUYÊN `usePhieuNhapDeTraHangNhap`/route `GET
// /api/tra-hang-nhap/phieu-nhap/:ma` (tra cứu) và `BangDongPhieuNhapDeTraHangNhap`,
// không viết lại phần tra cứu — cùng khuôn `TaoTraHang.tsx` (T-052d). KHÔNG
// hiển thị tạm tính "tiền hoàn" từng dòng trước khi lưu — công thức đó chỉ
// sống ở server (`tao-phieu-tra-hang-nhap.ts`).

/** Có ít nhất một dòng số lượng trả > 0. */
function coDongDuocChon(dong: readonly PhieuNhapDongDeTraHangNhapItem[], soLuongTra: Readonly<Record<string, number>>): boolean {
  return dong.some((d) => (soLuongTra[d.id] ?? 0) > 0);
}

/** Cập nhật số lượng trả một dòng — bỏ qua giá trị không nguyên, âm, vượt "còn trả được tối đa" của đúng dòng đó. */
export function suaSoLuongTraHangNhap(
  soLuongTra: Readonly<Record<string, number>>,
  dong: readonly PhieuNhapDongDeTraHangNhapItem[],
  phieuNhapDongId: string,
  giaTriMoi: number,
): Record<string, number> {
  const d = dong.find((x) => x.id === phieuNhapDongId);
  if (!d || !Number.isInteger(giaTriMoi) || giaTriMoi < 0 || giaTriMoi > d.conLaiToiDa) return soLuongTra;
  return { ...soLuongTra, [phieuNhapDongId]: giaTriMoi };
}

/** `undefined` nếu hợp lệ — ngược lại trả câu lỗi để hiện cho người dùng. */
export function validateTraHangNhap(
  dong: readonly PhieuNhapDongDeTraHangNhapItem[],
  soLuongTra: Readonly<Record<string, number>>,
): string | undefined {
  if (!coDongDuocChon(dong, soLuongTra)) return 'Chưa nhập số lượng trả cho dòng nào';
  return undefined;
}

/** Chỉ gửi dòng có số lượng > 0; quy đổi số lượng (đơn vị ĐÃ NHẬP) sang CƠ SỞ theo hệ số của chính dòng đó (SPEC.md §3.3). */
export function xayDungYeuCauTraHangNhap(
  phieuNhapId: string,
  dong: readonly PhieuNhapDongDeTraHangNhapItem[],
  soLuongTra: Readonly<Record<string, number>>,
): TaoTraHangNhapReq {
  return {
    phieuNhapId,
    dong: dong
      .filter((d) => (soLuongTra[d.id] ?? 0) > 0)
      .map((d) => ({
        phieuNhapDongId: d.id,
        soLuong: quyDoiSangCoSo(soLuongHienThi(soLuongTra[d.id] ?? 0), d.heSo),
      })),
  };
}

interface TaoTraHangNhapProps {
  /** Gọi khi lưu thành công, kèm id phiếu vừa tạo — màn danh sách mở sẵn chi tiết phiếu này. */
  onTaoXong: (id: string) => void;
  /** Mã phiếu nhập điền sẵn + tự tra cứu ngay (liên kết ngược từ `ChiTietPhieuNhap`, T-053c2) — không cần gõ lại. */
  maGoiY?: string | undefined;
}

/** Container: ô tìm phiếu nhập theo mã → bảng dòng (kèm ô nhập số lượng trả) → Lưu. */
export function TaoTraHangNhap({ onTaoXong, maGoiY }: TaoTraHangNhapProps) {
  const [oTim, setOTim] = useState(maGoiY ?? '');
  const [maDaTim, setMaDaTim] = useState<string | undefined>(maGoiY);
  const [soLuongTra, setSoLuongTra] = useState<Record<string, number>>({});
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | undefined>(undefined);
  const { duLieu: phieuNhap, dangTai, loi: loiTraCuu } = usePhieuNhapDeTraHangNhap(maDaTim);

  function timPhieuNhap(su: React.FormEvent) {
    su.preventDefault();
    setLoi(undefined);
    setSoLuongTra({});
    setMaDaTim(oTim.trim() || undefined);
  }

  function luu(su: React.FormEvent) {
    su.preventDefault();
    if (!phieuNhap || dangGui) return;

    const loiHopLe = validateTraHangNhap(phieuNhap.dong, soLuongTra);
    if (loiHopLe) {
      setLoi(loiHopLe);
      return;
    }

    setDangGui(true);
    setLoi(undefined);

    fetch('/api/tra-hang-nhap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(xayDungYeuCauTraHangNhap(phieuNhap.id, phieuNhap.dong, soLuongTra)),
    })
      .then(async (res) => {
        if (!res.ok) {
          const json: unknown = await res.json().catch(() => undefined);
          throw new Error((json as { loi?: string } | undefined)?.loi ?? 'Không lưu được phiếu trả hàng nhập');
        }
        return TraHangNhapResSchema.parse(await res.json());
      })
      .then((phieu) => {
        setDangGui(false);
        onTaoXong(phieu.id);
      })
      .catch((err: unknown) => {
        setDangGui(false);
        setLoi(err instanceof Error ? err.message : 'Không lưu được phiếu trả hàng nhập');
      });
  }

  return (
    <div className="tao-tra-hang-nhap">
      <h1 className="tao-tra-hang-nhap__tieu-de">Trả hàng nhập</h1>

      <form className="tao-tra-hang-nhap__o-tim" onSubmit={timPhieuNhap}>
        <TruongNhap aria-label="Tìm theo mã phiếu nhập" placeholder="Mã phiếu nhập" value={oTim} onChange={(su) => setOTim(su.target.value)} />
        <Nut type="submit" bienThe="phu">
          Tìm
        </Nut>
      </form>

      {dangTai ? <p className="tao-tra-hang-nhap__thong-bao">Đang tải…</p> : null}
      {loiTraCuu ? (
        <p className="tao-tra-hang-nhap__loi" role="alert">
          {loiTraCuu}
        </p>
      ) : null}

      {phieuNhap ? (
        phieuNhap.dong.length === 0 ? (
          <p className="tao-tra-hang-nhap__loi" role="alert">
            Phiếu nhập {phieuNhap.ma} chưa hoàn thành — chưa từng ghi kho nên chưa thể trả
          </p>
        ) : (
          <form className="tao-tra-hang-nhap__form" onSubmit={luu}>
            <p className="tao-tra-hang-nhap__phieu-nhap">
              Mã phiếu nhập: <strong>{phieuNhap.ma}</strong>
            </p>

            <BangDongPhieuNhapDeTraHangNhap
              dong={phieuNhap.dong}
              soLuongTra={soLuongTra}
              onSuaSoLuongTra={(id, giaTri) => setSoLuongTra((v) => suaSoLuongTraHangNhap(v, phieuNhap.dong, id, giaTri))}
            />

            {loi ? (
              <p className="tao-tra-hang-nhap__loi" role="alert">
                {loi}
              </p>
            ) : null}

            <Nut type="submit" bienThe="chinh" disabled={dangGui}>
              {dangGui ? 'Đang lưu…' : 'Lưu'}
            </Nut>
          </form>
        )
      ) : null}
    </div>
  );
}
