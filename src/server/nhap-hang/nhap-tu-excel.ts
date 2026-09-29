import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import ExcelJS from 'exceljs';
import { giaiNghiaCaiDatQuanLyLo, type GhiDeQuanLyLo } from '../../shared/cai-dat/giai-nghia';
import type { LoiDongNhapExcel } from '../../shared/hop-dong/nhap-tu-excel';
import { taoUlid } from '../../shared/kieu/ulid';
import { caiDat, donViTinh, sanPham } from '../db/schema';
import { taoPhieuNhap, type DongPhieuNhapInput, type PhieuNhapDaTao } from './tao-phieu-nhap';

type Db = ReturnType<typeof drizzle>;

// File này do PHẦN MỀM NÀY tự định nghĩa (không phải bản xuất KiotViet thật —
// khác T-060), nên tự do chọn cột. Thứ tự cột cố định, đọc theo VỊ TRÍ không
// theo tên, để không phải suy luận khi người dùng gõ lại tiêu đề khác chữ hoa.
export const CAC_TIEU_DE_MAU_EXCEL = [
  'Mã hàng',
  'Tên đơn vị',
  'Số lượng',
  'Đơn giá',
  'Số lô (để trống nếu không có)',
  'Hạn dùng yyyy-mm-dd (để trống nếu không có)',
] as const;

const DANG_HAN_DUNG = /^\d{4}-\d{2}-\d{2}$/;

export type KetQuaNhapTuExcel =
  | { thanhCong: true; phieu: PhieuNhapDaTao }
  | { thanhCong: false; loi: LoiDongNhapExcel[] };

/**
 * Sinh file .xlsx mẫu — đúng tiêu đề mà `nhapHangTuFileExcel` chấp nhận, kèm một
 * dòng ví dụ. Trả `Uint8Array` (không phải `Buffer` của Node) — `exceljs` tự
 * khai `declare interface Buffer extends ArrayBuffer {}` ở phạm vi toàn cục
 * trong `index.d.ts` của nó (lỗi đã biết của gói này), việc này GHÉP THÊM yêu
 * cầu vào kiểu `Buffer` thật của Node cho toàn bộ chương trình một khi đã
 * import `exceljs` ở bất kỳ đâu — nên tránh dùng `Buffer` trong chữ ký hàm của
 * chính module này, chỉ chạm `Buffer` (polluted) đúng tại ranh giới gọi
 * `exceljs` bên dưới.
 */
export async function taoMauExcelNhapHang(): Promise<Uint8Array<ArrayBuffer>> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Nhập hàng');
  sheet.addRow([...CAC_TIEU_DE_MAU_EXCEL]);
  sheet.addRow(['HH000001', 'Hộp', 5, 260_000, '', '']);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

interface DongTho {
  /** Số thứ tự dòng dữ liệu, 1-based, không tính dòng tiêu đề. */
  dong: number;
  maHang: string;
  donViTen: string;
  soLuongTho: unknown;
  donGiaTho: unknown;
  soLoTho: unknown;
  hsdTho: unknown;
}

/**
 * Đọc giá trị một ô Excel thành chuỗi hiển thị được — `exceljs` trả nhiều dạng
 * khác nhau tuỳ kiểu ô (chuỗi, số, ngày, rich text `{ text }`, công thức
 * `{ result }`...). Không dùng `String(x)` trên `unknown` trực tiếp (ô kiểu lạ
 * sẽ ra `"[object Object]"` thay vì báo lỗi rõ) — chỉ nhận biết các dạng đã
 * lường trước, còn lại coi như rỗng (dòng đó sẽ bị `xacThucDong` từ chối với
 * lý do rõ ràng thay vì âm thầm đọc sai).
 */
function oThanhChuoi(gia: unknown): string {
  if (gia === null || gia === undefined) return '';
  if (gia instanceof Date) return gia.toISOString().slice(0, 10);
  if (typeof gia === 'string' || typeof gia === 'number') return String(gia).trim();
  if (typeof gia === 'object' && 'text' in gia && typeof gia.text === 'string') return gia.text.trim();
  if (typeof gia === 'object' && 'result' in gia) return oThanhChuoi(gia.result);
  return '';
}

/** Đọc buffer .xlsx thành các dòng thô (chưa xác thực nghiệp vụ) — ném lỗi nếu tiêu đề sai hoặc không có dòng dữ liệu. */
async function docDongTho(buffer: Uint8Array): Promise<DongTho[]> {
  const wb = new ExcelJS.Workbook();
  try {
    // `exceljs` khai `.load(buffer: Buffer)` với kiểu `Buffer` đã bị chính nó
    // làm hỏng (xem chú thích ở `taoMauExcelNhapHang`) nên KHÔNG cast sang
    // `Buffer` — ép kiểu lại chữ ký hàm để nhận thẳng `Uint8Array`, đúng với
    // những gì hàm này thực sự cần lúc chạy.
    const load = wb.xlsx.load.bind(wb.xlsx) as unknown as (duLieu: Uint8Array) => Promise<unknown>;
    await load(buffer);
  } catch {
    throw new Error('Không đọc được file — kiểm tra đúng định dạng .xlsx');
  }

  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error('File không có sheet nào');

  const tieuDe = (sheet.getRow(1).values as unknown[]).slice(1).map((o) => oThanhChuoi(o));
  const khopMau = CAC_TIEU_DE_MAU_EXCEL.every((cot, i) => tieuDe[i] === cot);
  if (!khopMau) throw new Error('File không đúng tiêu đề của file mẫu — tải lại file mẫu và điền theo đúng cột');

  const ketQua: DongTho[] = [];
  let soDong = 0;
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const gia = row.values as unknown[];
    const rong = gia.length <= 1 || gia.slice(1).every((o) => oThanhChuoi(o) === '');
    if (rong) continue;

    soDong += 1;
    ketQua.push({
      dong: soDong,
      maHang: oThanhChuoi(gia[1]),
      donViTen: oThanhChuoi(gia[2]),
      soLuongTho: gia[3],
      donGiaTho: gia[4],
      soLoTho: gia[5],
      hsdTho: gia[6],
    });
  }

  if (ketQua.length === 0) throw new Error('File không có dòng dữ liệu nào');
  return ketQua;
}

function soNguyenTu(gia: unknown): number | undefined {
  if (typeof gia === 'number' && Number.isInteger(gia)) return gia;
  if (typeof gia === 'string' && gia.trim() !== '' && Number.isInteger(Number(gia))) return Number(gia);
  return undefined;
}

/** Xác thực nghiệp vụ từng dòng thô, chỉ ĐỌC CSDL (không ghi) — dùng để gom hết lỗi trước khi quyết định ghi kho hay không. */
function xacThucDong(db: Db, tho: DongTho[]): { loi: LoiDongNhapExcel[] } | { dong: DongPhieuNhapInput[] } {
  const loi: LoiDongNhapExcel[] = [];
  const dongHopLe: DongPhieuNhapInput[] = [];
  const toanCuc = db.select({ quanLyLo: caiDat.quanLyLo }).from(caiDat).all()[0]?.quanLyLo ?? false;

  for (const d of tho) {
    function baoLoi(thongDiep: string) {
      loi.push({ dong: d.dong, thongDiep });
    }

    if (!d.maHang) {
      baoLoi(`Dòng ${d.dong}: thiếu mã hàng`);
      continue;
    }
    const [sp] = db
      .select({ id: sanPham.id, quanLyLoGhiDe: sanPham.quanLyLoGhiDe })
      .from(sanPham)
      .where(eq(sanPham.maHang, d.maHang))
      .all();
    if (!sp) {
      baoLoi(`Dòng ${d.dong}: không tìm thấy mã hàng '${d.maHang}'`);
      continue;
    }

    if (!d.donViTen) {
      baoLoi(`Dòng ${d.dong}: thiếu tên đơn vị`);
      continue;
    }
    const cacDonVi = db.select().from(donViTinh).where(eq(donViTinh.sanPhamId, sp.id)).all();
    const donVi = cacDonVi.find((dv) => dv.ten.trim().toLowerCase() === d.donViTen.trim().toLowerCase());
    if (!donVi) {
      baoLoi(`Dòng ${d.dong}: sản phẩm '${d.maHang}' không có đơn vị '${d.donViTen}'`);
      continue;
    }

    const soLuong = soNguyenTu(d.soLuongTho);
    if (soLuong === undefined || soLuong <= 0) {
      baoLoi(`Dòng ${d.dong}: số lượng phải là số nguyên dương`);
      continue;
    }

    const donGia = soNguyenTu(d.donGiaTho);
    if (donGia === undefined || donGia < 0) {
      baoLoi(`Dòng ${d.dong}: đơn giá phải là số nguyên không âm`);
      continue;
    }

    const soLo = oThanhChuoi(d.soLoTho) || null;
    const hsdChuoi = oThanhChuoi(d.hsdTho) || null;
    if ((soLo !== null) !== (hsdChuoi !== null)) {
      baoLoi(`Dòng ${d.dong}: đã nhập số lô hoặc hạn dùng thì phải nhập đủ cả hai`);
      continue;
    }
    if (hsdChuoi !== null && !DANG_HAN_DUNG.test(hsdChuoi)) {
      baoLoi(`Dòng ${d.dong}: hạn dùng phải theo định dạng yyyy-mm-dd`);
      continue;
    }

    const ghiDe: GhiDeQuanLyLo = sp.quanLyLoGhiDe ?? 'KE_THUA';
    const batQuanLyLo = giaiNghiaCaiDatQuanLyLo(toanCuc, ghiDe);
    if (batQuanLyLo && soLo === null) {
      baoLoi(`Dòng ${d.dong}: sản phẩm '${d.maHang}' đang bật quản lý theo lô, bắt buộc nhập số lô và hạn dùng`);
      continue;
    }

    dongHopLe.push({
      id: taoUlid(),
      sanPhamId: sp.id,
      donViTen: donVi.ten,
      heSo: donVi.heSo,
      donGia,
      soLuong,
      soLo,
      hsd: hsdChuoi,
    });
  }

  return loi.length > 0 ? { loi } : { dong: dongHopLe };
}

/**
 * Nhập hàng từ file Excel (T-043, SPEC.md §6.2): đọc + xác thực TOÀN BỘ file
 * trước (chỉ đọc CSDL, không ghi gì); một dòng lỗi thì trả về danh sách lỗi và
 * KHÔNG gọi `taoPhieuNhap` — không có dòng nào được ghi (CLAUDE.md: "file lỗi
 * không làm hỏng kho — hoặc vào hết hoặc không vào gì"). Chỉ khi mọi dòng hợp
 * lệ mới tạo một phiếu nhập DUY NHẤT, hoàn thành ngay, qua đúng lõi nghiệp vụ
 * đã có (`taoPhieuNhap`, T-040a) — không viết lại logic ghi kho/lô/giá vốn ở
 * đây. `taoPhieuNhap` tự chạy trong một transaction nên atomic kể cả khi có
 * lỗi lọt qua bước xác thực phía trên (ví dụ đua dữ liệu giữa lúc đọc và ghi).
 */
export async function nhapHangTuFileExcel(
  db: Db,
  buffer: Uint8Array,
  chiNhanhId: string,
  thoiGian: string,
): Promise<KetQuaNhapTuExcel> {
  let tho: DongTho[];
  try {
    tho = await docDongTho(buffer);
  } catch (loi) {
    const thongDiep = loi instanceof Error ? loi.message : 'File không đọc được';
    return { thanhCong: false, loi: [{ dong: 0, thongDiep }] };
  }

  const xacThuc = xacThucDong(db, tho);
  if ('loi' in xacThuc) return { thanhCong: false, loi: xacThuc.loi };

  const phieu = taoPhieuNhap(db, {
    id: taoUlid(),
    chiNhanhId,
    thoiGian,
    hoanThanhNgay: true,
    dong: xacThuc.dong,
  });

  return { thanhCong: true, phieu };
}
