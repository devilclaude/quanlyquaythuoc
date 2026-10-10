import type { VaiTro } from '../../shared/hop-dong/auth';

export type Man = 'ban-hang' | 'hang-hoa' | 'nhap-hang' | 'tra-hang' | 'tra-hang-nhap' | 'tong-quan' | 'cai-dat';

export const manMacDinh: Man = 'ban-hang';

const MOI_MAN: readonly Man[] = [
  'ban-hang',
  'hang-hoa',
  'nhap-hang',
  'tra-hang',
  'tra-hang-nhap',
  'tong-quan',
  'cai-dat',
];

const MAN_NHAN_VIEN: readonly Man[] = ['ban-hang', 'tra-hang'];

/**
 * Màn nào hiện trên menu theo vai trò. Chỉ để giao diện gọn — quyền thật luôn do
 * máy chủ cưỡng chế (src/server/auth/phan-quyen.ts), nên danh sách này lệch với
 * máy chủ cùng lắm làm người dùng thấy lỗi 403, không mở được quyền nào.
 */
export function cacManChoPhep(vaiTro: VaiTro): readonly Man[] {
  return vaiTro === 'ADMIN' ? MOI_MAN : MAN_NHAN_VIEN;
}
