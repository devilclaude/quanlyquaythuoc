import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import type { TrangThaiKetNoi } from './chi-bao-trang-thai';
import { layTrangThaiHangDoi, type TrangThaiHangDoi } from './hang-doi-thao-tac';

const HANG_DOI_RONG: TrangThaiHangDoi = { soChoDongBo: 0, dongBoGanNhat: null };

/**
 * Theo dõi kết nối mạng thật qua sự kiện trình duyệt (`online`/`offline`), và
 * số thao tác chờ đồng bộ / mốc đồng bộ gần nhất từ hàng đợi Dexie thật
 * (T-031, `hang-doi-thao-tac.ts`) — không còn là hằng số 0/null.
 */
export function useTrangThaiKetNoi(): TrangThaiKetNoi {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true,
  );
  const [hangDoi, setHangDoi] = useState<TrangThaiHangDoi>(HANG_DOI_RONG);

  useEffect(() => {
    const capNhat = () => setOnline(navigator.onLine);
    window.addEventListener('online', capNhat);
    window.addEventListener('offline', capNhat);
    return () => {
      window.removeEventListener('online', capNhat);
      window.removeEventListener('offline', capNhat);
    };
  }, []);

  useEffect(() => {
    const theoDoi = liveQuery(() => layTrangThaiHangDoi()).subscribe({
      next: setHangDoi,
      // IndexedDB không đọc được (vd. chế độ duyệt riêng tư chặn lưu trữ) —
      // giữ mặc định rỗng thay vì làm hỏng chỉ báo trạng thái vì một lỗi phụ.
      error: () => setHangDoi(HANG_DOI_RONG),
    });
    return () => theoDoi.unsubscribe();
  }, []);

  return { online, ...hangDoi };
}
