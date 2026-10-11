import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DieuHuong } from './DieuHuong';

const ADMIN = { id: 'u1', tenDangNhap: 'admin', tenHienThi: 'Chủ quầy', vaiTro: 'ADMIN' as const };
const NHAN_VIEN = { id: 'u2', tenDangNhap: 'lan', tenHienThi: 'Chị Lan', vaiTro: 'NHAN_VIEN' as const };

function ve(nguoi: typeof ADMIN | typeof NHAN_VIEN, man: 'ban-hang' | 'tra-hang' = 'ban-hang') {
  return renderToStaticMarkup(
    <DieuHuong nguoi={nguoi} man={man} onChonMan={() => undefined} onDangXuat={() => undefined} />,
  );
}

describe('DieuHuong', () => {
  it('ADMIN thấy đủ 7 mục menu và nút Đăng xuất', () => {
    const html = ve(ADMIN);

    for (const nhan of ['Bán hàng', 'Hàng hoá', 'Nhập hàng', 'Trả hàng', 'Trả hàng nhập', 'Tổng quan', 'Cài đặt']) {
      expect(html, nhan).toContain(`>${nhan}</button>`);
    }
    expect(html).toContain('>Đăng xuất</button>');
  });

  it('NHAN_VIEN chỉ thấy Bán hàng và Trả hàng', () => {
    const html = ve(NHAN_VIEN);

    expect(html).toContain('>Bán hàng</button>');
    expect(html).toContain('>Trả hàng</button>');
    for (const nhan of ['Hàng hoá', 'Nhập hàng', 'Trả hàng nhập', 'Tổng quan', 'Cài đặt']) {
      expect(html, nhan).not.toContain(`>${nhan}</button>`);
    }
  });

  it('hiện tên hiển thị và vai trò bằng tiếng Việt', () => {
    expect(ve(ADMIN)).toContain('Chủ quầy');
    expect(ve(ADMIN)).toContain('Quản trị');
    expect(ve(NHAN_VIEN)).toContain('Chị Lan');
    expect(ve(NHAN_VIEN)).toContain('Nhân viên');
  });

  it('giữ tiêu đề app h1 "Quầy thuốc" để các màn và e2e tìm được', () => {
    expect(ve(ADMIN)).toMatch(/<h1[^>]*>Quầy thuốc<\/h1>/);
  });

  it('mục của màn đang chọn dùng biến thể chính, mục khác dùng biến thể phụ', () => {
    const html = ve(ADMIN, 'tra-hang');

    expect(html).toMatch(/nut--chinh[^>]*>Trả hàng<\/button>/);
    expect(html).toMatch(/nut--phu[^>]*>Bán hàng<\/button>/);
  });

  it('có nút Menu (đang đóng) để thu gọn danh sách mục trên điện thoại', () => {
    const html = ve(ADMIN);

    expect(html).toMatch(/<button[^>]*aria-label="Menu"[^>]*aria-expanded="false"[^>]*>/);
    expect(html).not.toContain('app__muc--mo');
  });

  it('hiện tên màn đang chọn cạnh nút Menu để người dùng biết mình đang ở đâu', () => {
    expect(ve(ADMIN, 'tra-hang')).toMatch(/<span[^>]*app__man-hien-tai[^>]*>Trả hàng<\/span>/);
  });
});
