import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { KhoiNhapTuExcel } from './NhapHangTuExcel';

const trangThaiRong = { dangTai: false, ketQua: undefined, loiTai: undefined };

describe('KhoiNhapTuExcel', () => {
  it('khớp screenshot: tiêu đề, liên kết tải file mẫu, nút chọn file', () => {
    const html = renderToStaticMarkup(<KhoiNhapTuExcel {...trangThaiRong} onChonFile={() => {}} />);

    expect(html).toContain('Nhập hàng');
    expect(html).toContain('Thêm sản phẩm từ file excel');
    expect(html).toContain('href="/api/phieu-nhap/mau-excel"');
    expect(html).toContain('Excel file');
    expect(html).toContain('Chọn file dữ liệu');
  });

  it('đang tải lên thì hiện trạng thái chờ', () => {
    const html = renderToStaticMarkup(
      <KhoiNhapTuExcel {...trangThaiRong} dangTai={true} onChonFile={() => {}} />,
    );
    expect(html).toContain('Đang tải lên');
  });

  it('kết quả thành công hiện mã phiếu vừa tạo', () => {
    const html = renderToStaticMarkup(
      <KhoiNhapTuExcel
        {...trangThaiRong}
        ketQua={{ thanhCong: true, phieu: { id: 'pn-1', ma: 'PN000009', trangThai: 'HOAN_THANH' } }}
        onChonFile={() => {}}
      />,
    );
    expect(html).toContain('PN000009');
  });

  it('kết quả lỗi hiện đủ danh sách lỗi theo dòng', () => {
    const html = renderToStaticMarkup(
      <KhoiNhapTuExcel
        {...trangThaiRong}
        ketQua={{
          thanhCong: false,
          loi: [
            { dong: 1, thongDiep: "Dòng 1: không tìm thấy mã hàng 'SP999'" },
            { dong: 2, thongDiep: 'Dòng 2: số lượng phải là số nguyên dương' },
          ],
        }}
        onChonFile={() => {}}
      />,
    );
    expect(html).toContain("không tìm thấy mã hàng");
    expect(html).toContain('số lượng phải là số nguyên dương');
  });

  it('lỗi mạng (không phải lỗi theo dòng) hiện thông báo riêng', () => {
    const html = renderToStaticMarkup(
      <KhoiNhapTuExcel {...trangThaiRong} loiTai="Không tải lên được — kiểm tra kết nối mạng" onChonFile={() => {}} />,
    );
    expect(html).toContain('Không tải lên được');
  });
});
