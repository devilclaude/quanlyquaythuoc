import type { MauBadge } from '../thanh-phan';

/** SPEC.md §5.5 / UI-FIDELITY.md — ba trường phải luôn hiện trên màn bán hàng. */
export interface TrangThaiKetNoi {
  online: boolean;
  soChoDongBo: number;
  /** Mốc thời gian đồng bộ thành công gần nhất (epoch ms), null = chưa từng đồng bộ. */
  dongBoGanNhat: number | null;
}

export interface NoiDungChiBao {
  nhanKetNoi: string;
  mauKetNoi: MauBadge;
  /** null khi không có gì chờ — UI-FIDELITY.md: "nếu có", không hiện badge rỗng. */
  nhanCho: string | null;
  nhanDongBo: string;
}

/** Hàm thuần: suy ra nội dung hiển thị từ trạng thái kết nối. Không chạm DOM/mạng. */
export function tinhNoiDungChiBao(trangThai: TrangThaiKetNoi): NoiDungChiBao {
  return {
    nhanKetNoi: trangThai.online ? 'Đang online' : 'Đang offline',
    mauKetNoi: trangThai.online ? 'tot' : 'nguy',
    nhanCho: trangThai.soChoDongBo > 0 ? `${trangThai.soChoDongBo} thao tác chờ đồng bộ` : null,
    nhanDongBo:
      trangThai.dongBoGanNhat === null
        ? 'Chưa đồng bộ lần nào'
        : `Đồng bộ gần nhất: ${dinhDangGio(trangThai.dongBoGanNhat)}`,
  };
}

function dinhDangGio(epochMs: number): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(epochMs));
}
