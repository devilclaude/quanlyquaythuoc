import { useCallback, useEffect, useState } from 'react';
import type { NguoiDungHienTai } from '../../shared/hop-dong/auth';
import { dangXuat as dangXuatMayChu, docNguoiDaLuu, layNguoiHienTai, luuNguoi, xoaNguoiDaLuu } from './phien-client';
import { type TrangThaiXacThuc, quyetDinhKhoiDong } from './trang-thai-khoi-dong';

/** `main.tsx` phát sự kiện này (qua `caiDatFetchToanCuc`) khi bất kỳ `/api/*` nào trả 401. */
export const SU_KIEN_HET_PHIEN = 'quaythuoc:het-phien';

export const GHI_CHU_HET_PHIEN = 'Phiên đã hết hạn, vui lòng đăng nhập lại';

export function useXacThuc(): {
  trangThai: TrangThaiXacThuc;
  dangNhapXong: (nguoi: NguoiDungHienTai) => void;
  dangXuat: () => Promise<void>;
} {
  const [trangThai, setTrangThai] = useState<TrangThaiXacThuc>({ loai: 'DANG_TAI' });

  const hoiMayChu = useCallback(async (huy: () => boolean) => {
    const ketQua = await layNguoiHienTai();
    if (huy()) return;
    const moi = quyetDinhKhoiDong(ketQua, docNguoiDaLuu());
    if (moi.loai === 'DA_DANG_NHAP' && !moi.tamThoiOffline) luuNguoi(moi.nguoi);
    if (moi.loai === 'CHUA_DANG_NHAP') xoaNguoiDaLuu();
    setTrangThai(moi);
  }, []);

  useEffect(() => {
    let daHuy = false;
    void hoiMayChu(() => daHuy);
    return () => {
      daHuy = true;
    };
  }, [hoiMayChu]);

  useEffect(() => {
    const khiHetPhien = () => {
      xoaNguoiDaLuu();
      setTrangThai((cu) =>
        cu.loai === 'DA_DANG_NHAP' ? { loai: 'CHUA_DANG_NHAP', ghiChu: GHI_CHU_HET_PHIEN } : cu,
      );
    };
    window.addEventListener(SU_KIEN_HET_PHIEN, khiHetPhien);
    return () => window.removeEventListener(SU_KIEN_HET_PHIEN, khiHetPhien);
  }, []);

  // Nút Back/Forward có thể khôi phục nguyên trang cũ từ bộ nhớ đệm (bfcache) — kể cả
  // sau khi đã đăng xuất, khi đó trên máy dùng chung sẽ lộ màn hình của người trước.
  // Trang được khôi phục không chạy lại effect nào, nên phải hỏi lại máy chủ ở đây.
  useEffect(() => {
    const khiHienLai = (e: PageTransitionEvent) => {
      if (e.persisted) void hoiMayChu(() => false);
    };
    window.addEventListener('pageshow', khiHienLai);
    return () => window.removeEventListener('pageshow', khiHienLai);
  }, [hoiMayChu]);

  // Đang vào app tạm thời lúc offline: có mạng lại thì hỏi máy chủ xác nhận phiên.
  useEffect(() => {
    if (trangThai.loai !== 'DA_DANG_NHAP' || !trangThai.tamThoiOffline) return undefined;
    let daHuy = false;
    const khiCoMang = () => void hoiMayChu(() => daHuy);
    window.addEventListener('online', khiCoMang);
    return () => {
      daHuy = true;
      window.removeEventListener('online', khiCoMang);
    };
  }, [trangThai, hoiMayChu]);

  const dangNhapXong = useCallback((nguoi: NguoiDungHienTai) => {
    luuNguoi(nguoi);
    setTrangThai({ loai: 'DA_DANG_NHAP', nguoi, tamThoiOffline: false });
  }, []);

  const dangXuat = useCallback(async () => {
    await dangXuatMayChu();
    setTrangThai({ loai: 'CHUA_DANG_NHAP' });
  }, []);

  return { trangThai, dangNhapXong, dangXuat };
}
