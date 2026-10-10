import { describe, expect, it } from 'vitest';
import { boDauTiengViet, khopTuKhoa } from './bo-dau';

describe('boDauTiengViet', () => {
  it('bỏ dấu thanh và dấu mũ/móc, đưa về chữ thường', () => {
    expect(boDauTiengViet('Nước muối sinh lý')).toBe('nuoc muoi sinh ly');
  });

  it('đổi đ/Đ thành d — NFD không tách được chữ này', () => {
    expect(boDauTiengViet('Đau đầu')).toBe('dau dau');
  });

  it('chuỗi không dấu giữ nguyên nội dung, chỉ hạ chữ thường', () => {
    expect(boDauTiengViet('SP001 Vitamin C')).toBe('sp001 vitamin c');
  });

  it('chuẩn hoá cả chuỗi gõ ở dạng tổ hợp (NFD) lẫn dựng sẵn (NFC)', () => {
    const nfd = 'Nước'.normalize('NFD');
    const nfc = 'Nước'.normalize('NFC');
    expect(boDauTiengViet(nfd)).toBe('nuoc');
    expect(boDauTiengViet(nfc)).toBe('nuoc');
  });
});

describe('khopTuKhoa', () => {
  it('từ khoá không dấu khớp tên có dấu', () => {
    expect(khopTuKhoa('Nước muối sinh lý 500ml', 'nuoc')).toBe(true);
  });

  it('từ khoá có dấu khớp tên có dấu', () => {
    expect(khopTuKhoa('Nước muối sinh lý 500ml', 'nước muối')).toBe(true);
  });

  it('từ khoá không khớp thì trả về false', () => {
    expect(khopTuKhoa('Nước muối sinh lý 500ml', 'vitamin')).toBe(false);
  });

  it('khớp một phần giữa chuỗi, không phân biệt hoa thường', () => {
    expect(khopTuKhoa('Paracetamol 500mg', 'ACETA')).toBe(true);
  });
});
