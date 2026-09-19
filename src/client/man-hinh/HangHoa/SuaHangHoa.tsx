import { useState } from 'react';
import { HangHoaChiTietResSchema, type HangHoaChiTietRes } from '../../../shared/hop-dong/hang-hoa';
import {
  FormTaoHangHoa,
  taoTrangThaiTuChiTiet,
  xayDungYeuCauSuaHangHoa,
  type TrangThaiFormTaoHangHoa,
} from './TaoMoiHangHoa';

interface SuaHangHoaProps {
  chiTiet: HangHoaChiTietRes;
  onHuy: () => void;
  onSuaXong: (chiTiet: HangHoaChiTietRes) => void;
}

/** Container sửa hàng hoá (T-009c) — tái dùng `FormTaoHangHoa` của T-009b, chỉ
 * đổi tiêu đề, khoá mã hàng, và gọi PUT thay vì POST. Mã hàng không đổi được
 * trong phạm vi task này (BACKLOG.md "Xong khi" T-009c). */
export function SuaHangHoa({ chiTiet, onHuy, onSuaXong }: SuaHangHoaProps) {
  const [trangThai, setTrangThai] = useState<TrangThaiFormTaoHangHoa>(() => taoTrangThaiTuChiTiet(chiTiet));
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | undefined>(undefined);

  function luu() {
    const yeuCau = xayDungYeuCauSuaHangHoa(trangThai);
    if ('loi' in yeuCau) {
      setLoi(yeuCau.loi);
      return;
    }

    setDangLuu(true);
    setLoi(undefined);

    fetch(`/api/hang-hoa/${chiTiet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(yeuCau),
    })
      .then(async (res) => {
        const json: unknown = await res.json();
        if (!res.ok) {
          const thongBao = (json as { loi?: string } | undefined)?.loi;
          throw new Error(thongBao ?? 'Không sửa được hàng hoá');
        }
        return HangHoaChiTietResSchema.parse(json);
      })
      .then((ct) => {
        setDangLuu(false);
        onSuaXong(ct);
      })
      .catch((err: unknown) => {
        setDangLuu(false);
        setLoi(err instanceof Error ? err.message : 'Không sửa được hàng hoá');
      });
  }

  return (
    <FormTaoHangHoa
      trangThai={trangThai}
      dangLuu={dangLuu}
      loi={loi}
      onDoi={setTrangThai}
      onHuy={onHuy}
      onLuu={luu}
      tieuDe="Sửa hàng hóa"
      maHangChiDoc
    />
  );
}
