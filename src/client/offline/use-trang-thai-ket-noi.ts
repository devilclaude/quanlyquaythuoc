import { useEffect, useState } from 'react';
import type { TrangThaiKetNoi } from './chi-bao-trang-thai';

/**
 * Theo dõi kết nối mạng thật qua sự kiện trình duyệt (`online`/`offline`).
 * `soChoDongBo`/`dongBoGanNhat` cố định 0/null: hàng đợi thao tác thật (Dexie,
 * T-031) chưa tồn tại nên chưa có gì để đếm hay báo mốc đồng bộ — sẽ có dữ liệu
 * thật khi T-031 xây hàng đợi, không phải mock trên đường chính.
 */
export function useTrangThaiKetNoi(): TrangThaiKetNoi {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
  );

  useEffect(() => {
    const capNhat = () => setOnline(navigator.onLine);
    window.addEventListener('online', capNhat);
    window.addEventListener('offline', capNhat);
    return () => {
      window.removeEventListener('online', capNhat);
      window.removeEventListener('offline', capNhat);
    };
  }, []);

  return { online, soChoDongBo: 0, dongBoGanNhat: null };
}
