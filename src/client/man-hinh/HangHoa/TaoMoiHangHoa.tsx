import { useState } from 'react';
import {
  HangHoaChiTietResSchema,
  type TaoDonViKhacReq,
  type TaoHangHoaReq,
} from '../../../shared/hop-dong/hang-hoa';
import { Nut, TruongNhap } from '../../thanh-phan';
import './TaoMoiHangHoa.css';

/**
 * Form "Tạo mới hàng hoá" (T-009b) — chỉ các trường trong phạm vi v1 (xem
 * BACKLOG.md "Xong khi" T-009b): Mã hàng, Tên hàng, đơn vị cơ sở + giá bán,
 * và các đơn vị khác kèm hệ số/giá riêng. KHÔNG có nhóm hàng, ảnh, thuộc tính,
 * vị trí, trọng lượng, hãng/nước sản xuất, định mức tồn, tồn kho ban đầu —
 * ngoài phạm vi task này (SPEC.md §2 đã chốt hoãn phần lớn, tồn vào qua phiếu
 * nhập ở T-040).
 */
export interface DongDonViKhac {
  key: string;
  ten: string;
  heSo: string;
  giaBan: string;
}

export interface TrangThaiFormTaoHangHoa {
  maHang: string;
  ten: string;
  donViCoSoTen: string;
  giaBan: string;
  donViKhac: DongDonViKhac[];
}

export function taoTrangThaiRong(): TrangThaiFormTaoHangHoa {
  return { maHang: '', ten: '', donViCoSoTen: '', giaBan: '', donViKhac: [] };
}

/**
 * Dòng đơn vị khác mới — hệ số mặc định 1, giá bán điền sẵn gợi ý = giá cơ sở
 * × hệ số (SPEC.md §3.3). Đây là hành vi MỘT LẦN của form lúc thêm dòng, không
 * phải quy tắc tự suy ra — người dùng sửa hệ số sau đó không làm giá đổi theo.
 */
export function dongDonViKhacMoi(khoa: string, giaCoSoRaw: string): DongDonViKhac {
  const heSoMacDinh = 1;
  const giaCoSo = Number(giaCoSoRaw);
  const coGiaHopLe = giaCoSoRaw.trim() !== '' && Number.isFinite(giaCoSo);
  return {
    key: khoa,
    ten: '',
    heSo: String(heSoMacDinh),
    giaBan: coGiaHopLe ? String(giaCoSo * heSoMacDinh) : '',
  };
}

function laSoNguyenKhongAm(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

/** Chuyển trạng thái form (chuỗi nhập tay) sang yêu cầu API, hoặc thông báo lỗi
 * đầu tiên gặp phải. Dòng đơn vị khác chưa gõ tên bị bỏ qua (coi như chưa dùng). */
export function xayDungYeuCauTaoHangHoa(
  tt: TrangThaiFormTaoHangHoa,
): TaoHangHoaReq | { loi: string } {
  const ten = tt.ten.trim();
  if (!ten) return { loi: 'Tên hàng là bắt buộc' };

  const donViCoSoTen = tt.donViCoSoTen.trim();
  if (!donViCoSoTen) return { loi: 'Tên đơn vị cơ sở là bắt buộc' };

  const giaBan = Number(tt.giaBan);
  if (!laSoNguyenKhongAm(giaBan)) return { loi: 'Giá bán không hợp lệ' };

  const donViKhac: TaoDonViKhacReq[] = [];
  for (const dong of tt.donViKhac) {
    const tenDong = dong.ten.trim();
    if (!tenDong) continue;

    const heSo = Number(dong.heSo);
    if (!Number.isInteger(heSo) || heSo < 1) {
      return { loi: `Hệ số đơn vị "${tenDong}" phải là số nguyên ≥ 1` };
    }

    const giaBanDong = Number(dong.giaBan);
    if (!laSoNguyenKhongAm(giaBanDong)) {
      return { loi: `Giá bán đơn vị "${tenDong}" không hợp lệ` };
    }

    donViKhac.push({ ten: tenDong, heSo, giaBan: giaBanDong });
  }

  const maHang = tt.maHang.trim();
  return maHang ? { maHang, ten, donViCoSoTen, giaBan, donViKhac } : { ten, donViCoSoTen, giaBan, donViKhac };
}

function capNhatDongKhac(
  tt: TrangThaiFormTaoHangHoa,
  khoa: string,
  phan: Partial<Omit<DongDonViKhac, 'key'>>,
): TrangThaiFormTaoHangHoa {
  return {
    ...tt,
    donViKhac: tt.donViKhac.map((d) => (d.key === khoa ? { ...d, ...phan } : d)),
  };
}

function xoaDongKhac(tt: TrangThaiFormTaoHangHoa, khoa: string): TrangThaiFormTaoHangHoa {
  return { ...tt, donViKhac: tt.donViKhac.filter((d) => d.key !== khoa) };
}

interface FormTaoHangHoaProps {
  trangThai: TrangThaiFormTaoHangHoa;
  dangLuu: boolean;
  loi: string | undefined;
  onDoi: (tt: TrangThaiFormTaoHangHoa) => void;
  onHuy: () => void;
  onLuu: () => void;
}

/** Thuần theo props — dựng riêng để test bố cục không phải đợi fetch thật. */
export function FormTaoHangHoa({ trangThai, dangLuu, loi, onDoi, onHuy, onLuu }: FormTaoHangHoaProps) {
  return (
    <div className="tao-moi-hang-hoa__man-phu" role="presentation">
      <div
        className="tao-moi-hang-hoa"
        role="dialog"
        aria-modal="true"
        aria-label="Tạo hàng hóa"
        onKeyDown={(su) => {
          if (su.key === 'Escape') onHuy();
        }}
      >
        <header className="tao-moi-hang-hoa__dau">
          <h2 className="tao-moi-hang-hoa__tieu-de">Tạo hàng hóa</h2>
          <button type="button" aria-label="Đóng" className="tao-moi-hang-hoa__dong" onClick={onHuy}>
            ×
          </button>
        </header>

        {loi ? (
          <p className="tao-moi-hang-hoa__loi" role="alert">
            {loi}
          </p>
        ) : null}

        <div className="tao-moi-hang-hoa__hang-truong">
          <TruongNhap
            nhan="Mã hàng"
            placeholder="Tự động"
            value={trangThai.maHang}
            onChange={(su) => onDoi({ ...trangThai, maHang: su.target.value })}
          />
          <TruongNhap
            nhan="Tên hàng"
            placeholder="Bắt buộc"
            value={trangThai.ten}
            onChange={(su) => onDoi({ ...trangThai, ten: su.target.value })}
            required
          />
        </div>

        <section className="tao-moi-hang-hoa__don-vi">
          <h3 className="tao-moi-hang-hoa__tieu-de-phu">Đơn vị tính</h3>

          <div className="tao-moi-hang-hoa__dong-co-so">
            <TruongNhap
              nhan="Tên đơn vị cơ sở"
              value={trangThai.donViCoSoTen}
              onChange={(su) => onDoi({ ...trangThai, donViCoSoTen: su.target.value })}
              required
            />
            <TruongNhap
              nhan="Giá bán"
              kieu="so"
              value={trangThai.giaBan}
              onChange={(su) => onDoi({ ...trangThai, giaBan: su.target.value })}
              required
            />
          </div>

          {trangThai.donViKhac.map((dong) => (
            <div className="tao-moi-hang-hoa__dong-khac" key={dong.key}>
              <TruongNhap
                nhan="Tên đơn vị"
                value={dong.ten}
                onChange={(su) => onDoi(capNhatDongKhac(trangThai, dong.key, { ten: su.target.value }))}
              />
              <span className="tao-moi-hang-hoa__quy-doi-dau" aria-hidden="true">
                =
              </span>
              <TruongNhap
                nhan="Giá trị quy đổi"
                kieu="so"
                value={dong.heSo}
                onChange={(su) => onDoi(capNhatDongKhac(trangThai, dong.key, { heSo: su.target.value }))}
              />
              <span className="tao-moi-hang-hoa__quy-doi-don-vi">
                {trangThai.donViCoSoTen || 'đơn vị cơ sở'}
              </span>
              <TruongNhap
                nhan="Giá bán"
                kieu="so"
                value={dong.giaBan}
                onChange={(su) => onDoi(capNhatDongKhac(trangThai, dong.key, { giaBan: su.target.value }))}
              />
              <Nut
                bienThe="phu"
                aria-label={`Xoá đơn vị${dong.ten ? ` ${dong.ten}` : ''}`}
                onClick={() => onDoi(xoaDongKhac(trangThai, dong.key))}
              >
                Xoá
              </Nut>
            </div>
          ))}

          <Nut
            bienThe="phu"
            onClick={() =>
              onDoi({
                ...trangThai,
                donViKhac: [...trangThai.donViKhac, dongDonViKhacMoi(`${Date.now()}-${trangThai.donViKhac.length}`, trangThai.giaBan)],
              })
            }
          >
            + Thêm đơn vị
          </Nut>
        </section>

        <footer className="tao-moi-hang-hoa__chan">
          <Nut bienThe="phu" onClick={onHuy} disabled={dangLuu}>
            Bỏ qua
          </Nut>
          <Nut bienThe="chinh" onClick={onLuu} disabled={dangLuu}>
            {dangLuu ? 'Đang lưu…' : 'Lưu'}
          </Nut>
        </footer>
      </div>
    </div>
  );
}

interface TaoMoiHangHoaProps {
  onHuy: () => void;
  onTaoXong: (id: string) => void;
}

/** Container: giữ trạng thái form, gọi POST /api/hang-hoa lúc Lưu. */
export function TaoMoiHangHoa({ onHuy, onTaoXong }: TaoMoiHangHoaProps) {
  const [trangThai, setTrangThai] = useState<TrangThaiFormTaoHangHoa>(taoTrangThaiRong());
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | undefined>(undefined);

  function luu() {
    const yeuCau = xayDungYeuCauTaoHangHoa(trangThai);
    if ('loi' in yeuCau) {
      setLoi(yeuCau.loi);
      return;
    }

    setDangLuu(true);
    setLoi(undefined);

    fetch('/api/hang-hoa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(yeuCau),
    })
      .then(async (res) => {
        const json: unknown = await res.json();
        if (!res.ok) {
          const thongBao = (json as { loi?: string } | undefined)?.loi;
          throw new Error(thongBao ?? 'Không tạo được hàng hoá');
        }
        return HangHoaChiTietResSchema.parse(json);
      })
      .then((chiTiet) => {
        setDangLuu(false);
        onTaoXong(chiTiet.id);
      })
      .catch((err: unknown) => {
        setDangLuu(false);
        setLoi(err instanceof Error ? err.message : 'Không tạo được hàng hoá');
      });
  }

  return (
    <FormTaoHangHoa trangThai={trangThai} dangLuu={dangLuu} loi={loi} onDoi={setTrangThai} onHuy={onHuy} onLuu={luu} />
  );
}
