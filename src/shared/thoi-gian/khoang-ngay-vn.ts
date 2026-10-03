// T-041b — bộ lọc "Thời gian" màn Danh sách nhập hàng. SPEC.md §3.6: lưu UTC,
// người dùng chọn khoảng theo giờ Việt Nam (UTC+7, không có giờ mùa hè) —
// các hàm dưới đây quy đổi một ngày/tháng VN sang ranh giới ISO UTC để lọc.

const MUI_GIO_VN_MS = 7 * 60 * 60 * 1000;

/** `ngayVN` dạng "yyyy-MM-dd" (giá trị thô của `<input type="date">`). */
function phanTichNgayVN(ngayVN: string): { nam: number; thang: number; ngay: number } {
  const khop = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ngayVN);
  if (!khop) throw new Error(`Ngày không hợp lệ: "${ngayVN}" (cần dạng yyyy-MM-dd)`);
  const [, namChu, thangChu, ngayChu] = khop;
  return { nam: Number(namChu), thang: Number(thangChu), ngay: Number(ngayChu) };
}

function layPhanSo(phan: Intl.DateTimeFormatPart[], type: 'year' | 'month'): number {
  const p = phan.find((x) => x.type === type);
  if (!p) throw new Error(`Intl.DateTimeFormat thiếu phần "${type}"`);
  return Number(p.value);
}

/** 00:00:00.000 giờ Việt Nam của một ngày, dạng ISO UTC — cận dưới khi lọc theo ngày. */
export function dauNgayVN(ngayVN: string): string {
  const { nam, thang, ngay } = phanTichNgayVN(ngayVN);
  return new Date(Date.UTC(nam, thang - 1, ngay, 0, 0, 0, 0) - MUI_GIO_VN_MS).toISOString();
}

/** 23:59:59.999 giờ Việt Nam của một ngày, dạng ISO UTC — cận trên khi lọc theo ngày. */
export function cuoiNgayVN(ngayVN: string): string {
  const { nam, thang, ngay } = phanTichNgayVN(ngayVN);
  return new Date(Date.UTC(nam, thang - 1, ngay, 23, 59, 59, 999) - MUI_GIO_VN_MS).toISOString();
}

/** Ngày hiện tại theo giờ Việt Nam, dạng "yyyy-MM-dd" — mốc "hôm nay" khi tính số ngày còn lại tới một hạn dùng (T-055). */
export function ngayHomNayVN(hienTai: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(hienTai);
}

/** Số ngày từ `tuNgayVN` đến `denNgayVN` (cả hai dạng "yyyy-MM-dd") — âm nếu `denNgayVN` ở trong quá khứ. */
export function soNgayGiuaHaiNgayVN(tuNgayVN: string, denNgayVN: string): number {
  const tu = phanTichNgayVN(tuNgayVN);
  const den = phanTichNgayVN(denNgayVN);
  const tuMs = Date.UTC(tu.nam, tu.thang - 1, tu.ngay);
  const denMs = Date.UTC(den.nam, den.thang - 1, den.ngay);
  return Math.round((denMs - tuMs) / 86_400_000);
}

/** Khoảng [đầu tháng, cuối tháng] của tháng hiện tại theo giờ Việt Nam — mặc định của bộ lọc "Thời gian". */
export function khoangThangNayVN(hienTai: Date = new Date()): { tu: string; den: string } {
  const phan = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(hienTai);
  const nam = layPhanSo(phan, 'year');
  const thang = layPhanSo(phan, 'month');

  const thangSau = thang === 12 ? 1 : thang + 1;
  const namThangSau = thang === 12 ? nam + 1 : nam;
  const dauThangSauMs = Date.UTC(namThangSau, thangSau - 1, 1, 0, 0, 0, 0) - MUI_GIO_VN_MS;

  const ngayDauThang = `${String(nam).padStart(4, '0')}-${String(thang).padStart(2, '0')}-01`;
  return { tu: dauNgayVN(ngayDauThang), den: new Date(dauThangSauMs - 1).toISOString() };
}
