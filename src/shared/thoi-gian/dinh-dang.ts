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
