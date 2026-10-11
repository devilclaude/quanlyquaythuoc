/**
 * Bỏ dấu tiếng Việt và đưa về chữ thường, để tìm "nuoc" ra "Nước". Chữ `đ`/`Đ`
 * không phải chữ cái kèm dấu rời nên chuẩn hoá NFD không tách được — phải đổi tay.
 */
export function boDauTiengViet(chuoi: string): string {
  return chuoi
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** `true` khi `tuKhoa` nằm trong `chuoi`, không phân biệt dấu và hoa/thường. */
export function khopTuKhoa(chuoi: string, tuKhoa: string): boolean {
  return boDauTiengViet(chuoi).includes(boDauTiengViet(tuKhoa));
}
