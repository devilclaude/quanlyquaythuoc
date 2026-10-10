import { type NguoiDungHienTai, NguoiDungSchema } from '../../shared/hop-dong/auth';

export type KetQuaDangNhap =
  | { loai: 'OK'; nguoi: NguoiDungHienTai }
  | { loai: 'SAI' }
  | { loai: 'BI_CHAN'; thuLaiSauGiay: number }
  | { loai: 'LOI_MANG' };

export type KetQuaToi = { loai: 'OK'; nguoi: NguoiDungHienTai } | { loai: 'CHUA_DANG_NHAP' } | { loai: 'LOI_MANG' };

export interface KhoLuu {
  getItem(khoa: string): string | null;
  setItem(khoa: string, giaTri: string): void;
  removeItem(khoa: string): void;
}

const KHOA_NGUOI_DUNG = 'quaythuoc.nguoi-dung';
const TEN_CACHE_TRA_CUU = 'danh-muc-tra-cuu';

function khoMacDinh(): KhoLuu | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Người dùng lần cuối đăng nhập thành công — chỉ để mở app khi mất mạng mà vẫn biết
 * hiện menu nào. KHÔNG phải bằng chứng đăng nhập: quyền thật luôn do máy chủ kiểm.
 */
export function docNguoiDaLuu(kho: KhoLuu | undefined = khoMacDinh()): NguoiDungHienTai | undefined {
  try {
    const tho = kho?.getItem(KHOA_NGUOI_DUNG);
    if (!tho) return undefined;
    const ketQua = NguoiDungSchema.safeParse(JSON.parse(tho));
    return ketQua.success ? ketQua.data : undefined;
  } catch {
    return undefined;
  }
}

export function luuNguoi(nguoi: NguoiDungHienTai, kho: KhoLuu | undefined = khoMacDinh()): void {
  try {
    kho?.setItem(KHOA_NGUOI_DUNG, JSON.stringify(nguoi));
  } catch {
    // Chế độ riêng tư chặn lưu trữ: bỏ qua, app vẫn chạy được khi có mạng.
  }
}

export function xoaNguoiDaLuu(kho: KhoLuu | undefined = khoMacDinh()): void {
  try {
    kho?.removeItem(KHOA_NGUOI_DUNG);
  } catch {
    // như trên
  }
}

export async function dangNhap(
  tenDangNhap: string,
  matKhau: string,
  fetchFn: typeof fetch = fetch,
): Promise<KetQuaDangNhap> {
  try {
    const res = await fetchFn('/api/auth/dang-nhap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenDangNhap, matKhau }),
    });
    if (res.status === 401) return { loai: 'SAI' };
    if (res.status === 429) {
      const giay = Number(res.headers.get('Retry-After'));
      return { loai: 'BI_CHAN', thuLaiSauGiay: Number.isFinite(giay) && giay > 0 ? giay : 60 };
    }
    if (!res.ok) return { loai: 'LOI_MANG' };
    const nguoi = NguoiDungSchema.safeParse(await res.json());
    return nguoi.success ? { loai: 'OK', nguoi: nguoi.data } : { loai: 'LOI_MANG' };
  } catch {
    return { loai: 'LOI_MANG' };
  }
}

export async function layNguoiHienTai(fetchFn: typeof fetch = fetch): Promise<KetQuaToi> {
  try {
    const res = await fetchFn('/api/auth/toi');
    if (res.status === 401) return { loai: 'CHUA_DANG_NHAP' };
    if (!res.ok) return { loai: 'LOI_MANG' };
    const nguoi = NguoiDungSchema.safeParse(await res.json());
    return nguoi.success ? { loai: 'OK', nguoi: nguoi.data } : { loai: 'LOI_MANG' };
  } catch {
    return { loai: 'LOI_MANG' };
  }
}

/**
 * Đăng xuất: dọn cục bộ LUÔN chạy dù gọi máy chủ có thất bại (mất mạng) hay không.
 * Cố ý KHÔNG đụng hàng đợi thao tác offline (IndexedDB `thaoTac`) — đó là đơn đã
 * bán chưa đồng bộ, xoá là mất tiền (SPEC.md §5.2).
 */
export async function dangXuat(
  deps: { fetchFn?: typeof fetch; kho?: KhoLuu; caches?: Pick<CacheStorage, 'delete'> } = {},
): Promise<void> {
  const fetchFn = deps.fetchFn ?? fetch;
  try {
    await fetchFn('/api/auth/dang-xuat', { method: 'POST' });
  } catch {
    // Mất mạng: cookie phiên còn ở máy chủ cho tới khi hết hạn; vẫn dọn phía máy này.
  }
  xoaNguoiDaLuu(deps.kho ?? khoMacDinh());
  const boNho = deps.caches ?? (typeof caches === 'undefined' ? undefined : caches);
  try {
    await boNho?.delete(TEN_CACHE_TRA_CUU);
  } catch {
    // Không xoá được cache thì thôi — không chặn đăng xuất.
  }
}
