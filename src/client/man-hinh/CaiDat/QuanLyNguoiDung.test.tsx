import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KhoiBangNguoiDung, KhoiThemNguoiDung } from './QuanLyNguoiDung';

const ADMIN = { id: 'u1', tenDangNhap: 'admin', tenHienThi: 'Chủ quầy', vaiTro: 'ADMIN' as const, hoatDong: true, ngayTao: '2026-10-10T00:00:00.000Z' };
const LAN = { id: 'u2', tenDangNhap: 'lan', tenHienThi: 'Chị Lan', vaiTro: 'NHAN_VIEN' as const, hoatDong: true, ngayTao: '2026-10-10T00:01:00.000Z' };
const MINH = { id: 'u3', tenDangNhap: 'minh', tenHienThi: 'Anh Minh', vaiTro: 'NHAN_VIEN' as const, hoatDong: false, ngayTao: '2026-10-10T00:02:00.000Z' };

const KHONG_LAM_GI = () => undefined;

function veBang(overrides: Partial<Parameters<typeof KhoiBangNguoiDung>[0]> = {}) {
  return renderToStaticMarkup(
    <KhoiBangNguoiDung
      danhSach={[ADMIN, LAN, MINH]}
      nguoiHienTaiId="u1"
      loi={undefined}
      idDatLaiDangMo={undefined}
      matKhauMoi=""
      dangXuLy={false}
      onDoiMatKhauMoi={KHONG_LAM_GI}
      onKhoaHoacMo={KHONG_LAM_GI}
      onMoDatLai={KHONG_LAM_GI}
      onLuuDatLai={KHONG_LAM_GI}
      {...overrides}
    />,
  );
}

describe('KhoiBangNguoiDung', () => {
  it('có tiêu đề và đủ cột bằng tiếng Việt', () => {
    const html = veBang();

    expect(html).toContain('Người dùng');
    for (const cot of ['Tên đăng nhập', 'Tên hiển thị', 'Vai trò', 'Trạng thái', 'Thao tác']) {
      expect(html, cot).toContain(`>${cot}</th>`);
    }
  });

  it('hiển thị từng người với vai trò và trạng thái dễ hiểu', () => {
    const html = veBang();

    expect(html).toContain('Chủ quầy');
    expect(html).toContain('Quản trị');
    expect(html).toContain('Chị Lan');
    expect(html).toContain('Nhân viên');
    expect(html).toContain('Hoạt động');
    expect(html).toContain('Đã khoá');
  });

  it('hàng của chính mình không có nút Khoá; người khác thì có Khoá hoặc Mở khoá', () => {
    const html = veBang();

    expect(html.match(/>Khoá<\/button>/g)).toHaveLength(1);
    expect(html.match(/>Mở khoá<\/button>/g)).toHaveLength(1);
  });

  it('mọi hàng đều có nút Đặt lại mật khẩu (kể cả của mình)', () => {
    expect(veBang().match(/>Đặt lại mật khẩu<\/button>/g)).toHaveLength(3);
  });

  it('danh sách rỗng hiện câu thông báo', () => {
    expect(veBang({ danhSach: [] })).toContain('Chưa có người dùng');
  });

  it('có lỗi thì hiện trong vùng cảnh báo', () => {
    expect(veBang({ loi: 'Phải còn ít nhất một quản trị viên đang hoạt động' })).toMatch(
      /role="alert"[^>]*>[^<]*Phải còn ít nhất một quản trị viên đang hoạt động/,
    );
  });

  it('không có lỗi thì không có vùng cảnh báo', () => {
    expect(veBang()).not.toContain('role="alert"');
  });

  it('mở đặt lại mật khẩu: chỉ hàng được chọn có ô Mật khẩu mới và nút Lưu', () => {
    const html = veBang({ idDatLaiDangMo: 'u2', matKhauMoi: 'abc' });

    expect(html.match(/aria-label="Mật khẩu mới"/g)).toHaveLength(1);
    expect(html).toContain('type="password"');
    expect(html.match(/>Lưu<\/button>/g)).toHaveLength(1);
  });

  it('đang xử lý thì các nút bị vô hiệu để không bấm đôi', () => {
    const html = veBang({ dangXuLy: true });

    expect(html).toMatch(/<button[^>]*disabled[^>]*>Khoá<\/button>/);
  });
});

describe('KhoiThemNguoiDung', () => {
  it('có đủ ô nhập, ô chọn vai trò mặc định Nhân viên và nút Thêm người dùng', () => {
    const html = renderToStaticMarkup(
      <KhoiThemNguoiDung
        giaTri={{ tenDangNhap: '', tenHienThi: '', matKhau: '', vaiTro: 'NHAN_VIEN' }}
        dangXuLy={false}
        onDoi={KHONG_LAM_GI}
        onThem={KHONG_LAM_GI}
      />,
    );

    for (const nhan of ['Tên đăng nhập', 'Tên hiển thị', 'Mật khẩu', 'Vai trò']) {
      expect(html, nhan).toContain(nhan);
    }
    expect(html).toContain('type="password"');
    expect(html).toMatch(/<option value="NHAN_VIEN" selected="">Nhân viên<\/option>/);
    expect(html).toContain('<option value="ADMIN">Quản trị</option>');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Thêm người dùng<\/button>/);
  });
});
