import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FormTaoHangHoa,
  dongDonViKhacMoi,
  taoTrangThaiRong,
  xayDungYeuCauTaoHangHoa,
} from './TaoMoiHangHoa';

describe('dongDonViKhacMoi', () => {
  it('điền sẵn hệ số 1 và giá gợi ý = giá cơ sở × hệ số (SPEC.md §3.3)', () => {
    const dong = dongDonViKhacMoi('k1', '1000');
    expect(dong.heSo).toBe('1');
    expect(dong.giaBan).toBe('1000');
  });

  it('giá cơ sở rỗng hoặc không phải số thì gợi ý giá rỗng, không ném lỗi', () => {
    expect(dongDonViKhacMoi('k1', '').giaBan).toBe('');
    expect(dongDonViKhacMoi('k1', 'abc').giaBan).toBe('');
  });
});

describe('xayDungYeuCauTaoHangHoa', () => {
  const goc = { ...taoTrangThaiRong(), ten: 'Paracetamol 500mg', donViCoSoTen: 'viên', giaBan: '500' };

  it('dựng đúng yêu cầu khi chỉ có đơn vị cơ sở', () => {
    const ketQua = xayDungYeuCauTaoHangHoa(goc);
    expect(ketQua).toEqual({ ten: 'Paracetamol 500mg', donViCoSoTen: 'viên', giaBan: 500, donViKhac: [] });
  });

  it('gộp mã hàng khi có nhập, bỏ khi để trống (server tự sinh)', () => {
    const coMa = xayDungYeuCauTaoHangHoa({ ...goc, maHang: '  SP009  ' });
    expect('maHang' in coMa && coMa.maHang).toBe('SP009');

    const khongMa = xayDungYeuCauTaoHangHoa(goc);
    expect('maHang' in khongMa).toBe(false);
  });

  it('bỏ qua dòng đơn vị khác chưa gõ tên', () => {
    const ketQua = xayDungYeuCauTaoHangHoa({
      ...goc,
      donViKhac: [dongDonViKhacMoi('k1', '500')],
    });
    expect('donViKhac' in ketQua && ketQua.donViKhac).toEqual([]);
  });

  it('chuyển đúng hệ số và giá riêng cho từng đơn vị khác đã gõ tên', () => {
    const ketQua = xayDungYeuCauTaoHangHoa({
      ...goc,
      donViKhac: [
        { key: 'k1', ten: 'vỉ', heSo: '12', giaBan: '6000' },
        { key: 'k2', ten: 'hộp', heSo: '180', giaBan: '90000' },
      ],
    });
    expect('donViKhac' in ketQua && ketQua.donViKhac).toEqual([
      { ten: 'vỉ', heSo: 12, giaBan: 6000 },
      { ten: 'hộp', heSo: 180, giaBan: 90000 },
    ]);
  });

  it('từ chối tên hàng bỏ trống', () => {
    expect(xayDungYeuCauTaoHangHoa({ ...goc, ten: '  ' })).toEqual({ loi: 'Tên hàng là bắt buộc' });
  });

  it('từ chối hệ số nhỏ hơn 1 ở đơn vị khác (SPEC.md §3.3)', () => {
    const ketQua = xayDungYeuCauTaoHangHoa({
      ...goc,
      donViKhac: [{ key: 'k1', ten: 'vỉ', heSo: '0', giaBan: '6000' }],
    });
    expect(ketQua).toEqual({ loi: 'Hệ số đơn vị "vỉ" phải là số nguyên ≥ 1' });
  });

  it('từ chối giá bán không phải số nguyên không âm', () => {
    expect(xayDungYeuCauTaoHangHoa({ ...goc, giaBan: '-1' })).toEqual({ loi: 'Giá bán không hợp lệ' });
  });
});

describe('FormTaoHangHoa (bố cục)', () => {
  it('có đủ nhãn khớp screenshot "Tạo mới hàng hóa" trong phạm vi T-009b', () => {
    const html = renderToStaticMarkup(
      <FormTaoHangHoa
        trangThai={taoTrangThaiRong()}
        dangLuu={false}
        loi={undefined}
        onDoi={() => {}}
        onHuy={() => {}}
        onLuu={() => {}}
      />,
    );

    for (const nhan of ['Mã hàng', 'Tên hàng', 'Tên đơn vị cơ sở', 'Giá bán', 'Đơn vị tính']) {
      expect(html).toContain(nhan);
    }
  });

  it('hiện thông báo lỗi khi có', () => {
    const html = renderToStaticMarkup(
      <FormTaoHangHoa
        trangThai={taoTrangThaiRong()}
        dangLuu={false}
        loi="Mã hàng đã tồn tại: SP001"
        onDoi={() => {}}
        onHuy={() => {}}
        onLuu={() => {}}
      />,
    );

    expect(html).toContain('Mã hàng đã tồn tại: SP001');
  });
});
