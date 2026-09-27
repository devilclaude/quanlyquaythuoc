import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import type { Ulid } from '../../shared/kieu/ulid';

// T-032 — số hoá đơn cấp tại client khi offline (SPEC.md §5.3: "Cấp ngay tại
// client, dạng HD<mã máy>-<số tăng dần>... Bất biến từ lúc in. Không bao giờ
// đánh số lại sau khi đồng bộ"; DOMAIN-NOTES.md: "dùng tiền tố theo thiết bị
// hoặc ID do client sinh (ULID), không dùng số tăng dần tập trung"). Không có
// đăng ký mã máy thủ công nào trong SPEC/DOMAIN-NOTES — mã máy ở đây là một ID
// ngẫu nhiên client tự sinh một lần, đúng lựa chọn DOMAIN-NOTES cho phép, tránh
// yêu cầu quầy phải tự quản lý số máy bằng tay (nguồn lỗi va số thật).
//
// Dexie riêng cho module này (không dùng chung `csdlCucBo` của T-031): mỗi
// module offline tự quản lý bảng của mình, không ai cần biết hình dạng dữ liệu
// của module kia — cùng nguyên tắc đã áp dụng cho `hang-doi-thao-tac.ts`.

const DO_DAI_SO_THU_TU = 6;
const BANG_CHU_MA_MAY = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32, khớp bảng chữ ULID của dự án
const DO_DAI_MA_MAY = 6; // 32^6 ≈ 1 tỷ tổ hợp — đủ để hai thiết bị không va mã dù sinh hoàn toàn ngẫu nhiên

export const ThietBiCucBoSchema = z.object({
  id: z.literal('THIET_BI'),
  maMay: z.string().min(1),
  boDemTiepTheo: z.number().int().positive(),
});
export type ThietBiCucBo = z.infer<typeof ThietBiCucBoSchema>;

export const SoHoaDonDaCapSchema = z.object({
  soHoaDon: z.string().min(1),
  idThaoTac: z.string().min(1),
  thoiGianCap: z.number().int().nonnegative(),
});
export type SoHoaDonDaCap = z.infer<typeof SoHoaDonDaCapSchema>;

type CsdlSoHoaDon = Dexie & {
  thietBi: EntityTable<ThietBiCucBo, 'id'>;
  soHoaDonDaCap: EntityTable<SoHoaDonDaCap, 'soHoaDon'>;
};

function taoCsdlSoHoaDon(): CsdlSoHoaDon {
  const db = new Dexie('quanlyquaythuoc-so-hoa-don') as CsdlSoHoaDon;
  db.version(1).stores({
    thietBi: 'id',
    // idThaoTac unique: nền tảng của tính idempotent — một thao tác chỉ được
    // gán đúng một số hoá đơn, dù gọi cấp số lại bao nhiêu lần.
    soHoaDonDaCap: 'soHoaDon, &idThaoTac, thoiGianCap',
  });
  return db;
}

export const csdlSoHoaDon = taoCsdlSoHoaDon();

function macHoaMaMayNgauNhien(): string {
  const cacByte = new Uint8Array(DO_DAI_MA_MAY);
  crypto.getRandomValues(cacByte);
  let ma = '';
  for (const b of cacByte) {
    ma += BANG_CHU_MA_MAY[b % 32];
  }
  return ma;
}

export function dinhDangSoHoaDon(maMay: string, soThuTu: number): string {
  return `HD${maMay}-${String(soThuTu).padStart(DO_DAI_SO_THU_TU, '0')}`;
}

/**
 * Lấy bản ghi thiết bị cục bộ, sinh mới nếu chưa có. Dùng `add` + bắt
 * `ConstraintError` (không phải get-rồi-add) để get-or-create là một thao tác
 * an toàn khi có lệnh gọi chồng lấn — cùng mẫu đã dùng ở `themThaoTac` (T-031).
 */
async function layHoacTaoThietBi(): Promise<ThietBiCucBo> {
  const hienTai = await csdlSoHoaDon.thietBi.get('THIET_BI');
  if (hienTai) {
    return ThietBiCucBoSchema.parse(hienTai);
  }
  const moi: ThietBiCucBo = { id: 'THIET_BI', maMay: macHoaMaMayNgauNhien(), boDemTiepTheo: 1 };
  try {
    await csdlSoHoaDon.thietBi.add(moi);
    return moi;
  } catch (loi) {
    if (loi instanceof Dexie.ConstraintError) {
      const banGhi = await csdlSoHoaDon.thietBi.get('THIET_BI');
      return ThietBiCucBoSchema.parse(banGhi);
    }
    throw loi;
  }
}

/** Mã máy của thiết bị này — sinh một lần, không bao giờ đổi sau đó. */
export async function layMaMayHienTai(): Promise<string> {
  const thietBi = await layHoacTaoThietBi();
  return thietBi.maMay;
}

/**
 * Cấp số hoá đơn tiếp theo cho một thao tác bán hàng offline (`idThaoTac` là
 * ULID của thao tác đó trong hàng đợi T-031). Idempotent theo `idThaoTac`: gọi
 * lại nhiều lần cho cùng một thao tác luôn trả về đúng số đã cấp lần đầu,
 * không tăng bộ đếm thêm — đây là cách hiện thực "bất biến từ lúc in" (SPEC.md
 * §5.3) ở tầng client, và tránh mất một số trong dãy khi thao tác được gọi lại
 * do mạng chập chờn hoặc tải lại trang.
 */
export async function capSoHoaDonTiepTheo(idThaoTac: Ulid): Promise<string> {
  const daCap = await csdlSoHoaDon.soHoaDonDaCap.where('idThaoTac').equals(idThaoTac).first();
  if (daCap) {
    return SoHoaDonDaCapSchema.parse(daCap).soHoaDon;
  }

  return csdlSoHoaDon.transaction('rw', csdlSoHoaDon.thietBi, csdlSoHoaDon.soHoaDonDaCap, async () => {
    // Đọc lại bên trong transaction: chặn khe hở race giữa hai lệnh gọi cùng
    // idThaoTac chồng lấn (kiểm tra ở ngoài xong đều thấy "chưa có" rồi cùng cấp mới).
    const conTrongGiaoDich = await csdlSoHoaDon.soHoaDonDaCap.where('idThaoTac').equals(idThaoTac).first();
    if (conTrongGiaoDich) {
      return SoHoaDonDaCapSchema.parse(conTrongGiaoDich).soHoaDon;
    }

    const thietBi = await layHoacTaoThietBi();
    const soHoaDon = dinhDangSoHoaDon(thietBi.maMay, thietBi.boDemTiepTheo);
    await csdlSoHoaDon.thietBi.put({ ...thietBi, boDemTiepTheo: thietBi.boDemTiepTheo + 1 });
    await csdlSoHoaDon.soHoaDonDaCap.add({ soHoaDon, idThaoTac, thoiGianCap: Date.now() });
    return soHoaDon;
  });
}

/** Tra cứu cục bộ: số hoá đơn đã in luôn tra lại được (T-032 "Xong khi"). */
export async function traCuuSoHoaDonCucBo(soHoaDon: string): Promise<SoHoaDonDaCap | undefined> {
  const banGhi = await csdlSoHoaDon.soHoaDonDaCap.get(soHoaDon);
  return banGhi ? SoHoaDonDaCapSchema.parse(banGhi) : undefined;
}
