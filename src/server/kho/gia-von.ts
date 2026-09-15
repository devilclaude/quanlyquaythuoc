import { chiaLamTronNuaLen } from '../../shared/tien/lam-tron';

export interface TrangThaiGiaVon {
  readonly ton: number;
  readonly giaTriTon: number;
}

// Bước gấp DUY NHẤT của bình quân gia quyền (SPEC.md §3.4) — dùng cả khi ghi
// trực tiếp (ghiTheKho) lẫn khi dựng lại từ sổ cái (dungLaiTonKhoDem), để
// không có hai đường tính khác nhau cho cùng một con số.
//
// `giaTri` là tổng tiền tường minh của một dòng VÀO (vd. NHAP với tổng tiền
// T) — dòng RA không bao giờ nhận giá trị từ bên ngoài, COGS luôn suy ra từ
// bình quân gia quyền hiện có.
export function apDungGiaVon(
  hienTai: TrangThaiGiaVon | undefined,
  soLuong: number,
  giaTri: number | undefined,
): TrangThaiGiaVon {
  const tonTruoc = hienTai?.ton ?? 0;
  const giaTriTruoc = hienTai?.giaTriTon ?? 0;

  if (soLuong > 0) {
    return { ton: tonTruoc + soLuong, giaTriTon: giaTriTruoc + (giaTri ?? 0) };
  }

  if (soLuong < 0) {
    const soLuongXuat = -soLuong;

    // Chưa từng có tồn dương để tính đơn giá — không có gì để chia, giữ
    // nguyên giá trị tồn (ràng buộc chặn tồn âm nằm ở tầng phân bổ phía trên,
    // đây chỉ là sổ sách).
    if (tonTruoc <= 0) {
      return { ton: tonTruoc + soLuong, giaTriTon: giaTriTruoc };
    }

    // Xuất hết hoặc vượt tồn ghi nhận: giá trị tồn về đúng 0, không qua phép
    // chia — đây chính là ca "bán hết thì gia_tri_ton về đúng 0" của SPEC.md.
    const cogs =
      soLuongXuat >= tonTruoc ? giaTriTruoc : chiaLamTronNuaLen(giaTriTruoc * soLuongXuat, tonTruoc);

    return { ton: tonTruoc + soLuong, giaTriTon: giaTriTruoc - cogs };
  }

  return { ton: tonTruoc, giaTriTon: giaTriTruoc };
}
